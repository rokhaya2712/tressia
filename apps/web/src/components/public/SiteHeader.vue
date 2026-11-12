<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { getLenis } from '@/motion/lenis'
import UiButton from '@/components/ui/UiButton.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const scrolled = ref(false)
const open = ref(false)

const onScroll = () => { scrolled.value = window.scrollY > 24 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll); document.documentElement.style.overflow = '' })

watch(() => route.fullPath, () => { open.value = false })
watch(open, (v) => {
  document.documentElement.style.overflow = v ? 'hidden' : ''
  const l = getLenis()
  if (l) v ? l.stop() : l.start()
})

const accountLink = computed(() => {
  if (auth.isAdmin) return { label: 'Administration', to: '/admin' }
  if (auth.isOwner) return { label: 'Espace tresseuse', to: '/pro' }
  if (auth.isClient) return { label: 'Mes rendez-vous', to: '/mes-rendez-vous' }
  return null
})

async function logout() {
  await auth.logout().catch(() => {})
  open.value = false
  router.push({ name: 'home' })
}
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ease-[var(--ease-editorial)]"
    :class="scrolled || open ? 'border-b border-line/80 bg-cream/95 backdrop-blur-sm' : 'border-b border-transparent bg-transparent'"
  >
    <div class="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
      <RouterLink to="/" class="flex min-h-11 items-center" aria-label="Tressia, accueil">
        <span class="font-display text-[2rem] font-medium leading-none tracking-[-0.01em]">Tressia<span class="text-terracotta">.</span></span>
      </RouterLink>

      <nav class="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
        <RouterLink to="/tresseuses" class="nav-link">Trouver une tresseuse</RouterLink>
        <RouterLink to="/devenir-tresseuse" class="nav-link">Devenir tresseuse</RouterLink>
        <span class="h-5 w-px bg-line" aria-hidden="true" />
        <template v-if="accountLink">
          <RouterLink :to="accountLink.to" class="nav-link">{{ accountLink.label }}</RouterLink>
          <button type="button" class="nav-link" @click="logout">Déconnexion</button>
        </template>
        <template v-else>
          <RouterLink to="/connexion" class="nav-link">Connexion</RouterLink>
          <UiButton to="/tresseuses" variant="ink" size="md">Réserver</UiButton>
        </template>
      </nav>

      <button
        type="button"
        class="-mr-2 flex size-11 items-center justify-center rounded-full lg:hidden"
        :aria-expanded="open"
        aria-controls="menu-mobile"
        :aria-label="open ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="open = !open"
      >
        <X v-if="open" class="size-6" :stroke-width="1.5" />
        <Menu v-else class="size-6" :stroke-width="1.5" />
      </button>
    </div>

    <Transition name="menu">
      <div v-if="open" id="menu-mobile" class="grain fixed inset-x-0 bottom-0 top-20 flex flex-col overflow-y-auto bg-cream px-5 pb-8 pt-6 sm:px-8 lg:hidden" data-lenis-prevent>
        <p class="eyebrow text-ink-soft/70">Menu</p>
        <ol class="mt-4 border-t border-line">
          <li class="border-b border-line">
            <RouterLink to="/tresseuses" class="menu-item"><span class="menu-num">01</span>Trouver une tresseuse</RouterLink>
          </li>
          <li class="border-b border-line">
            <RouterLink to="/devenir-tresseuse" class="menu-item"><span class="menu-num">02</span>Devenir tresseuse</RouterLink>
          </li>
          <li v-if="accountLink" class="border-b border-line">
            <RouterLink :to="accountLink.to" class="menu-item"><span class="menu-num">03</span>{{ accountLink.label }}</RouterLink>
          </li>
          <li v-else class="border-b border-line">
            <RouterLink to="/connexion" class="menu-item"><span class="menu-num">03</span>Connexion</RouterLink>
          </li>
        </ol>
        <div class="mt-auto pt-10">
          <UiButton v-if="!accountLink" to="/tresseuses" variant="terracotta" size="lg" block>Réserver une coiffure</UiButton>
          <UiButton v-else variant="outline" size="lg" block @click="logout">Déconnexion</UiButton>
          <p class="mt-6 font-script text-3xl text-terracotta">Fait en Alsace</p>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.nav-link {
  position: relative; display: inline-flex; min-height: 2.75rem; align-items: center;
  font-size: 0.875rem; font-weight: 500; color: var(--color-ink);
}
.nav-link::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0.6rem; height: 1px; background: currentColor;
  transform: scaleX(0); transform-origin: right; transition: transform 0.5s var(--ease-editorial);
}
.nav-link:hover::after, .nav-link.router-link-active::after { transform: scaleX(1); transform-origin: left; }
.menu-item {
  display: flex; align-items: baseline; gap: 1rem; min-height: 4.5rem; padding: 1rem 0;
  font-family: var(--font-display); font-size: 2.4rem; line-height: 1; font-weight: 400;
}
.menu-num { font-family: var(--font-sans); font-size: 0.75rem; letter-spacing: 0.2em; color: var(--color-terracotta); }
.menu-enter-active, .menu-leave-active { transition: opacity 0.45s var(--ease-editorial), transform 0.45s var(--ease-editorial); }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-12px); }
</style>
