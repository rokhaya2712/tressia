<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogOut, Menu, Store, Users, X } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const drawer = ref(false)
watch(() => route.name, () => { drawer.value = false })
const nav = [
  { to: { name: 'admin-salons' }, name: 'admin-salons', label: 'Tresseuses', icon: Store },
  { to: { name: 'admin-users' }, name: 'admin-users', label: 'Utilisateurs', icon: Users },
]
async function logout() {
  await auth.logout().catch(() => {})
  router.push('/')
}
</script>

<template>
  <div class="min-h-dvh bg-cream lg:pl-60">
    <div class="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 text-cream lg:hidden">
      <button type="button" class="rounded-md p-1.5 hover:bg-cream/10" aria-label="Ouvrir le menu" @click="drawer = true"><Menu class="size-5" /></button>
      <span class="font-display text-xl">Tressia</span>
      <span class="w-8" />
    </div>
    <div v-if="drawer" class="fixed inset-0 z-40 bg-ink/50 lg:hidden" @click="drawer = false" />
    <aside class="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-ink text-cream transition-transform duration-200 lg:translate-x-0" :class="drawer ? 'translate-x-0' : '-translate-x-full'">
      <div class="flex items-start justify-between px-6 pt-7 pb-6">
        <RouterLink to="/">
          <span class="font-display text-[28px] leading-none">Tressia</span>
          <span class="eyebrow mt-1.5 block text-gold">Administration</span>
        </RouterLink>
        <button type="button" class="rounded-md p-1 text-cream/70 hover:bg-cream/10 lg:hidden" aria-label="Fermer le menu" @click="drawer = false"><X class="size-5" /></button>
      </div>
      <nav class="flex-1 px-3" aria-label="Navigation administration">
        <RouterLink v-for="item in nav" :key="item.name" :to="item.to" class="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition" :class="route.name === item.name ? 'bg-copper font-semibold text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream'">
          <component :is="item.icon" class="size-[18px]" /> {{ item.label }}
        </RouterLink>
      </nav>
      <div class="border-t border-cream/10 px-3 py-4">
        <button type="button" class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-cream/75 hover:bg-cream/8 hover:text-cream" @click="logout"><LogOut class="size-[18px]" /> Déconnexion</button>
        <p v-if="auth.user" class="truncate px-3 pt-2 text-[12px] text-cream/40">{{ auth.user.email }}</p>
      </div>
    </aside>
    <main class="px-5 py-8 sm:px-10 lg:py-10">
      <header class="mb-8 border-b border-line pb-5">
        <p class="eyebrow text-copper">Administration</p>
        <h1 class="mt-1 font-display text-4xl leading-tight text-ink">{{ route.meta.title }}</h1>
      </header>
      <slot />
    </main>
  </div>
</template>
