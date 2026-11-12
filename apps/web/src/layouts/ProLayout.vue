<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, Clock, ExternalLink, Images, LayoutDashboard, LogOut, Menu, Scissors, Store, Users, X } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { usePro } from '@/stores/pro'
import UiSpinner from '@/components/ui/UiSpinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pro = usePro()
const drawer = ref(false)
const error = ref('')

const nav = [
  { to: { name: 'pro-dashboard' }, name: 'pro-dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: { name: 'pro-agenda' }, name: 'pro-agenda', label: 'Agenda', icon: CalendarDays },
  { to: { name: 'pro-services' }, name: 'pro-services', label: 'Catalogue', icon: Scissors },
  { to: { name: 'pro-staff' }, name: 'pro-staff', label: 'Planning', icon: Users },
  { to: { name: 'pro-hours' }, name: 'pro-hours', label: 'Horaires', icon: Clock },
  { to: { name: 'pro-gallery' }, name: 'pro-gallery', label: 'Galerie', icon: Images },
  { to: { name: 'pro-profile' }, name: 'pro-profile', label: 'Profil', icon: Store },
]
const isOnboarding = computed(() => route.name === 'pro-onboarding')

async function guard() {
  try { await pro.load() } catch (e) { error.value = e instanceof Error ? e.message : 'Erreur de chargement'; return }
  if (pro.missing && !isOnboarding.value) router.replace({ name: 'pro-onboarding' })
  else if (!pro.missing && pro.salon && isOnboarding.value) router.replace({ name: 'pro-dashboard' })
}
watch(() => route.name, () => { drawer.value = false; guard() }, { immediate: true })

const ready = computed(() => pro.loaded && (isOnboarding.value ? pro.missing : !!pro.salon))

async function logout() {
  await auth.logout().catch(() => {})
  pro.reset()
  router.push('/')
}
</script>

<template>
  <!-- Onboarding : pas de barre laterale -->
  <div v-if="isOnboarding" class="min-h-dvh bg-cream">
    <header class="flex items-center justify-between border-b border-line px-5 py-4 sm:px-10">
      <RouterLink to="/" class="font-display text-2xl text-ink">Tressia <span class="eyebrow ml-2 align-middle text-copper">Espace tresseuse</span></RouterLink>
      <button type="button" class="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-terracotta" @click="logout"><LogOut class="size-4" /> Déconnexion</button>
    </header>
    <p v-if="error" class="p-10 text-terracotta">{{ error }}</p>
    <UiSpinner v-else-if="!ready" />
    <slot v-else />
  </div>

  <div v-else class="min-h-dvh bg-cream lg:pl-64">
    <!-- Barre mobile -->
    <div class="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-ink px-4 py-3 text-cream lg:hidden">
      <button type="button" class="rounded-md p-1.5 hover:bg-cream/10" aria-label="Ouvrir le menu" @click="drawer = true"><Menu class="size-5" /></button>
      <span class="font-display text-xl">Tressia</span>
      <span class="w-8" />
    </div>
    <div v-if="drawer" class="fixed inset-0 z-40 bg-ink/50 lg:hidden" @click="drawer = false" />

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-cream transition-transform duration-200 lg:translate-x-0"
      :class="drawer ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-start justify-between px-6 pt-7 pb-6">
        <RouterLink to="/" class="block">
          <span class="font-display text-[28px] leading-none">Tressia</span>
          <span class="eyebrow mt-1.5 block text-gold">Espace tresseuse</span>
        </RouterLink>
        <button type="button" class="rounded-md p-1 text-cream/70 hover:bg-cream/10 lg:hidden" aria-label="Fermer le menu" @click="drawer = false"><X class="size-5" /></button>
      </div>
      <div v-if="pro.salon" class="mx-6 border-y border-cream/10 py-4">
        <p class="text-[11px] uppercase tracking-[0.2em] text-cream/50">Votre profil</p>
        <p class="mt-1 font-display text-xl leading-tight">{{ pro.salon.name }}</p>
        <p class="text-[13px] text-cream/60">{{ pro.salon.neighborhood }}, {{ pro.salon.city }}</p>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation espace salon">
        <RouterLink
          v-for="item in nav" :key="item.name" :to="item.to"
          class="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition"
          :class="route.name === item.name ? 'bg-copper text-cream font-semibold' : 'text-cream/75 hover:bg-cream/8 hover:text-cream'"
        >
          <component :is="item.icon" class="size-[18px]" /> {{ item.label }}
        </RouterLink>
      </nav>
      <div class="space-y-1 border-t border-cream/10 px-3 py-4">
        <RouterLink v-if="pro.salon?.status === 'published'" :to="`/salons/${pro.salon.slug}`" class="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-cream/75 hover:bg-cream/8 hover:text-cream">
          <ExternalLink class="size-[18px]" /> Voir ma page publique
        </RouterLink>
        <button type="button" class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-cream/75 hover:bg-cream/8 hover:text-cream" @click="logout">
          <LogOut class="size-[18px]" /> Déconnexion
        </button>
        <p v-if="auth.user" class="truncate px-3 pt-2 text-[12px] text-cream/40">{{ auth.user.email }}</p>
      </div>
    </aside>

    <div v-if="pro.salon?.status === 'pending'" class="border-b border-copper/30 bg-copper/12 px-5 py-3 text-[14px] text-ink sm:px-10">
      <span class="font-semibold text-copper">En attente.</span> Votre profil est en attente de validation par l'équipe Tressia. Vous pouvez déjà compléter votre catalogue et vos horaires.
    </div>
    <div v-else-if="pro.salon?.status === 'suspended'" class="border-b border-terracotta/30 bg-terracotta/10 px-5 py-3 text-[14px] text-terracotta sm:px-10">
      Votre profil est suspendu et n'apparaît plus dans les recherches. Contactez l'équipe Tressia.
    </div>

    <main class="px-5 py-8 sm:px-10 lg:py-10">
      <header class="mb-8 border-b border-line pb-5">
        <p class="eyebrow text-copper">Espace tresseuse</p>
        <h1 class="mt-1 font-display text-4xl leading-tight text-ink sm:text-[44px]">{{ route.meta.title }}</h1>
      </header>
      <p v-if="error" class="text-terracotta">{{ error }}</p>
      <UiSpinner v-else-if="!ready" />
      <slot v-else />
    </main>
  </div>
</template>
