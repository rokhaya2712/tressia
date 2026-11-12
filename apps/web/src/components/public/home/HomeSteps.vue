<script setup lang="ts">
const steps = [
  { n: '01', title: 'Vous cherchez', text: 'Par coiffure, par quartier ou par commune si vous voulez qu\'elle vienne chez vous. Chaque tresseuse affiche ses prix et la durée de chaque coiffure.' },
  { n: '02', title: 'Vous choisissez l\'heure', text: 'Les créneaux affichés sont réellement libres. Chez elle sans frais, ou chez vous avec les frais de déplacement affichés avant de confirmer.' },
  { n: '03', title: 'C\'est réservé', text: 'Votre rendez-vous est confirmé tout de suite. Vous le retrouvez dans « Mes rendez-vous », et vous pouvez l\'annuler si besoin.' },
]
</script>

<template>
  <section class="grain bg-sand/60">
    <div class="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-10 lg:py-32">
      <div class="lg:col-span-4">
        <div class="lg:sticky lg:top-32">
          <p class="eyebrow text-terracotta">03 / Comment ça marche</p>
          <h2 class="mt-5 font-display text-[clamp(2.6rem,5vw,4.75rem)] font-light leading-[0.95] tracking-[-0.02em]">
            Trois temps, <br /><span class="font-script text-terracotta">sans appel</span> <br />ni attente.
          </h2>
        </div>
      </div>
      <ol class="lg:col-span-8">
        <li
          v-for="(s, i) in steps"
          :key="s.n"
          v-reveal
          class="grid grid-cols-[auto_1fr] gap-x-6 border-t border-ink/15 py-10 sm:gap-x-10 lg:py-14"
          :class="['', 'lg:ml-16', 'lg:ml-32'][i]"
        >
          <span class="font-display text-[clamp(4rem,9vw,8rem)] font-light leading-[0.8] text-terracotta">{{ s.n }}</span>
          <div class="max-w-md pt-2">
            <h3 class="font-display text-3xl leading-tight sm:text-4xl">{{ s.title }}</h3>
            <p class="mt-3 text-[15px] leading-relaxed text-ink-soft">{{ s.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
