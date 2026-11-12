<script setup lang="ts">
import { ArrowRight, Star } from '@lucide/vue'
import { formatEuro, type SalonCardDto } from '@tressia/shared'

defineProps<{ salons: SalonCardDto[]; loading: boolean; error: boolean }>()
</script>

<template>
  <section class="border-t border-line py-20 lg:py-32">
    <div class="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
      <div>
        <p class="eyebrow text-terracotta">02 / Tresseuses à la une</p>
        <h2 class="mt-5 font-display text-[clamp(2.6rem,6vw,5.5rem)] font-light leading-[0.95] tracking-[-0.02em]">
          Ils ouvrent leur <span class="font-script text-terracotta">agenda</span> cette semaine.
        </h2>
      </div>
      <RouterLink to="/tresseuses" class="group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold">
        Voir toutes les tresseuses
        <ArrowRight class="size-4 transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
      </RouterLink>
    </div>

    <!-- Chargement -->
    <div v-if="loading" class="mx-auto mt-12 flex max-w-[1440px] gap-5 overflow-hidden px-5 sm:px-8 lg:px-10" aria-hidden="true">
      <div v-for="i in 4" :key="i" class="w-[78%] shrink-0 sm:w-[44%] lg:w-[24%]">
        <div class="aspect-[3/4] animate-pulse rounded-t-full rounded-b-[var(--radius-card)] bg-sand" />
        <div class="mt-5 h-6 w-2/3 animate-pulse rounded bg-sand" />
      </div>
    </div>

    <!-- Erreur ou vide -->
    <div v-else-if="error || !salons.length" class="mx-auto mt-12 max-w-[1440px] px-5 sm:px-8 lg:px-10">
      <div class="rounded-[var(--radius-card)] border border-line px-6 py-12 text-center sm:px-12">
        <p class="font-display text-3xl">Les premières tresseuses arrivent.</p>
        <p class="mt-2 text-sm text-ink-soft">{{ error ? 'Impossible de charger les tresseuses pour le moment.' : 'Aucune tresseuse publiée pour l\'instant.' }}</p>
      </div>
    </div>

    <!-- Liste : défilement horizontal sur mobile -->
    <ul v-else class="mx-auto mt-12 flex max-w-[1440px] snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 sm:px-8 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-10 [scrollbar-width:none]" data-lenis-prevent-wheel>
      <li v-for="(s, i) in salons" :key="s.id" v-reveal="i * 0.06" class="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto" :class="i % 2 === 1 && 'lg:mt-16'">
        <RouterLink :to="{ name: 'salon', params: { slug: s.slug } }" class="group block">
          <div class="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[var(--radius-card)] bg-sand">
            <img v-if="s.coverUrl" :src="s.coverUrl" :alt="`Coiffure de ${s.name}`" class="size-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-editorial)] group-hover:scale-105" loading="lazy" />
            <div v-else class="grain flex size-full items-center justify-center bg-sand">
              <span class="font-script text-8xl text-terracotta">{{ s.name.charAt(0) }}</span>
            </div>
            <span class="absolute left-4 top-[42%] eyebrow rounded-full bg-cream/90 px-3 py-1.5 text-[0.62rem] text-ink">{{ String(i + 1).padStart(2, '0') }}</span>
          </div>
          <div class="mt-5 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-display text-[1.85rem] leading-tight">{{ s.name }}</p>
              <p class="mt-1 text-sm text-ink-soft">{{ s.neighborhood }}, {{ s.city }}</p>
            </div>
            <p v-if="s.rating" class="mt-2 inline-flex shrink-0 items-center gap-1 text-sm"><Star class="size-3.5 fill-copper text-copper" aria-hidden="true" />{{ s.rating.toFixed(1) }}</p>
          </div>
          <p v-if="s.minPriceEur" class="mt-3 border-t border-line pt-3 text-sm">à partir de <span class="font-semibold">{{ formatEuro(s.minPriceEur) }}</span></p>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
