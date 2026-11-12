<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import SiteHeader from '@/components/public/SiteHeader.vue'
import SiteFooter from '@/components/public/SiteFooter.vue'
import { startLenis, stopLenis } from '@/motion/lenis'

onMounted(() => startLenis())
onBeforeUnmount(() => stopLenis())
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-cream text-ink">
    <a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-cream">Aller au contenu</a>
    <SiteHeader />
    <main id="contenu" class="flex-1 pt-20">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
