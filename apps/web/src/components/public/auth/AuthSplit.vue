<script setup lang="ts">
import fallback from '@/assets/img/hair8.jpg'
defineProps<{ eyebrow: string; title: string; quote?: string; image?: string }>()
</script>

<template>
  <div class="grain min-h-screen bg-cream pt-20 lg:grid lg:grid-cols-2 lg:pt-0">
    <aside class="relative hidden overflow-hidden bg-terracotta-deep lg:block">
      <img
        :src="image ?? fallback"
        alt=""
        class="absolute inset-0 size-full object-cover opacity-90"
      />
      <div class="absolute inset-0 bg-ink/35" aria-hidden="true" />
      <div class="absolute inset-x-12 bottom-14 text-cream">
        <p class="font-script text-5xl text-gold">Tressia</p>
        <p v-if="quote" class="mt-4 max-w-md font-display text-3xl italic leading-snug">{{ quote }}</p>
      </div>
    </aside>
    <section class="flex items-center justify-center px-4 py-12 sm:px-8 lg:min-h-screen lg:pt-28">
      <div class="w-full max-w-md">
        <p class="eyebrow text-copper">{{ eyebrow }}</p>
        <h1 class="mt-3 font-display text-5xl leading-[0.95] sm:text-6xl">{{ title }}</h1>
        <div class="mt-8"><slot /></div>
        <div class="mt-8 border-t border-line pt-6 text-sm text-ink-soft"><slot name="footer" /></div>
      </div>
    </section>
  </div>
</template>
