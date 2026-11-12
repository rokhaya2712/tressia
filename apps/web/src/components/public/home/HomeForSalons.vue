<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import barberImg from '@/assets/img/barber-01.jpg'

const lines = [
  { n: '01', label: 'Agenda en ligne', note: 'à jour en temps réel' },
  { n: '02', label: 'Catalogue et prix', note: 'en euros' },
  { n: '03', label: 'Réservations confirmées', note: 'automatiquement' },
  { n: '04', label: 'Horaires et congés', note: 'à jour' },
  { n: '05', label: 'Pendant le lancement', note: 'gratuit' },
]
</script>

<template>
  <section class="bg-ink text-cream">
    <div class="mx-auto grid max-w-[1440px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10 lg:py-32">
      <div class="lg:col-span-5">
        <p class="eyebrow text-copper">04 / Pour les tresseuses</p>
        <h2 class="mt-5 font-display text-[clamp(2.8rem,6vw,5.75rem)] font-light leading-[0.92] tracking-[-0.02em]">
          Votre fauteuil, <br />occupé du lundi <br />au <span class="font-script text-copper">samedi</span>.
        </h2>
        <p class="mt-8 max-w-sm text-[15px] leading-relaxed text-cream/70">
          Moins d'appels manqués, moins d'allers-retours sur WhatsApp. Vous publiez vos coiffures et vos communes, l'agenda se remplit.
        </p>
        <div class="mt-10 flex flex-wrap gap-3">
          <UiButton :to="{ name: 'register', query: { pro: '1' } }" variant="copper" size="lg">Créer mon profil</UiButton>
          <RouterLink to="/devenir-tresseuse" class="inline-flex h-14 items-center px-4 text-sm font-semibold text-cream/80 underline decoration-cream/30 underline-offset-[6px] hover:text-cream">En savoir plus</RouterLink>
        </div>
      </div>
      <div class="self-end lg:col-span-6 lg:col-start-7">
        <figure v-reveal class="mb-10 overflow-hidden rounded-[var(--radius-card)]">
          <img :src="barberImg" alt="Un client se fait tresser, en noir et blanc" class="aspect-[16/8] w-full object-cover grayscale" loading="lazy" />
        </figure>
        <ul v-reveal.stagger>
        <li v-for="l in lines" :key="l.n" class="flex items-baseline gap-5 border-b border-cream/15 py-5 first:border-t sm:gap-8">
          <span class="text-xs font-semibold tracking-[0.2em] text-copper">{{ l.n }}</span>
          <span class="font-display text-[clamp(1.6rem,3vw,2.5rem)] leading-tight">{{ l.label }}</span>
          <span class="ml-auto hidden h-px flex-1 translate-y-[-0.3em] border-b border-dotted border-cream/25 sm:block" aria-hidden="true" />
          <span class="eyebrow shrink-0 text-cream/60">{{ l.note }}</span>
        </li>
        </ul>
      </div>
    </div>
  </section>
</template>
