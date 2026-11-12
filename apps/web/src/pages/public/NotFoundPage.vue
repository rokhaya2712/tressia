<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
</script>

<template>
  <section class="mx-auto grid min-h-[70vh] max-w-[1440px] items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:px-10">
    <div class="relative lg:col-span-6">
      <p class="font-display text-[clamp(8rem,26vw,20rem)] font-light leading-[0.8] tracking-[-0.04em] text-line">404</p>
      <p class="absolute bottom-[12%] left-[18%] font-script text-[clamp(2.5rem,6vw,5rem)] leading-none text-terracotta">perdue ?</p>
    </div>
    <div class="lg:col-span-5 lg:col-start-8">
      <p class="eyebrow text-terracotta">Page introuvable</p>
      <h1 class="mt-5 font-display text-[clamp(2.4rem,5vw,4rem)] font-light leading-[0.95]">Cette adresse ne mène à aucun salon.</h1>
      <p class="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft">Le lien est peut-être ancien, ou la tresseuse a changé de nom. Repartez de la recherche.</p>
      <div class="mt-8 flex flex-wrap gap-3">
        <UiButton to="/tresseuses" variant="ink" size="lg">Trouver une tresseuse</UiButton>
        <UiButton to="/" variant="ghost" size="lg">Accueil</UiButton>
      </div>
    </div>
  </section>
</template>
