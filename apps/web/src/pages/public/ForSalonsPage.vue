<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import heroImg from '@/assets/img/coiffeuses.jpg'

const features = [
  { n: '01', title: 'Chez vous ou chez elles', text: 'Vous choisissez : recevoir chez vous, vous déplacer, ou les deux. Vous fixez les communes desservies et vos frais de déplacement.' },
  { n: '02', title: 'Votre catalogue, vos prix', text: 'Tresses, tissage, coupe, soins : vous fixez la durée et le prix en euros. Les clientes savent ce qu\'elles paieront avant de venir.' },
  { n: '03', title: 'Réservations confirmées automatiquement', text: 'Un créneau libre se réserve sans échange de messages. Vous voyez le rendez-vous arriver dans votre agenda.' },
  { n: '04', title: 'Gratuit pendant le lancement', text: 'Aucun abonnement, aucune commission pendant la phase de lancement en Alsace.' },
]
</script>

<template>
  <div>
    <section class="mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-12 lg:px-10 lg:pb-24 lg:pt-16">
      <div class="lg:col-span-7">
        <p v-reveal class="eyebrow text-terracotta">Pour les tresseuses</p>
        <h1 v-reveal="0.05" class="mt-6 font-display text-[clamp(3rem,8vw,7.5rem)] font-light leading-[0.9] tracking-[-0.025em]">
          Vous tenez <br />les mèches, <span class="font-script text-terracotta">Tressia</span> <br />tient l'agenda.
        </h1>
        <p v-reveal="0.1" class="mt-8 max-w-md text-base leading-relaxed text-ink-soft">
          Une page pour vos coiffures et vos prix, votre adresse gardée privée, et un agenda que vos clientes remplissent elles-mêmes.
        </p>
        <div v-reveal="0.15" class="mt-10 flex flex-wrap gap-3">
          <UiButton :to="{ name: 'register', query: { pro: '1' } }" variant="terracotta" size="lg">Créer mon profil</UiButton>
          <UiButton to="/connexion" variant="outline" size="lg">J'ai déjà un compte</UiButton>
        </div>
      </div>
      <div v-reveal="0.1" class="relative self-start lg:col-span-4 lg:col-start-9">
        <div class="aspect-[4/5] overflow-hidden rounded-t-full rounded-b-[var(--radius-card)] bg-sand">
          <img :src="heroImg" alt="Des tresseuses au travail" class="size-full object-cover object-[40%_50%]" />
        </div>
        <p class="absolute -bottom-5 -left-4 rounded-full bg-ink px-5 py-3 eyebrow text-cream">0 € au lancement</p>
      </div>
    </section>

    <section class="border-t border-line">
      <ol class="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <li v-for="f in features" :key="f.n" v-reveal class="grid gap-4 border-b border-line py-10 lg:grid-cols-12 lg:items-baseline lg:py-14">
          <span class="text-xs font-semibold tracking-[0.2em] text-terracotta lg:col-span-1">{{ f.n }}</span>
          <h2 class="font-display text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1] lg:col-span-6">{{ f.title }}</h2>
          <p class="max-w-md text-[15px] leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9">{{ f.text }}</p>
        </li>
      </ol>
    </section>

    <section class="grain bg-terracotta text-cream">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-28">
        <h2 class="font-display text-[clamp(2.6rem,6vw,5rem)] font-light leading-[0.95]">
          Prêt à ouvrir <br />votre <span class="font-script text-sand">agenda</span> ?
        </h2>
        <div class="flex flex-col items-start gap-3">
          <UiButton :to="{ name: 'register', query: { pro: '1' } }" variant="cream" size="lg">Créer mon profil de tresseuse</UiButton>
          <p class="text-sm text-cream/70">Environ dix minutes pour tout configurer.</p>
        </div>
      </div>
    </section>
  </div>
</template>
