<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import braidsImg from '@/assets/img/braiding-02.jpg'
import barberImg from '@/assets/img/barber-03.jpg'
import afroImg from '@/assets/img/contact.jpg'

const others = [
  { slug: 'twists', label: 'Twists & vanilles' },
  { slug: 'fulani', label: 'Fulani' },
  { slug: 'crochet', label: 'Crochet braids' },
  { slug: 'traditionnel', label: 'Coiffures traditionnelles' },
  { slug: 'enfants', label: 'Enfants' },
]
const to = (category: string) => ({ name: 'search', query: { category } })
</script>

<template>
  <section class="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-10 lg:py-32">
    <div class="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div class="lg:col-span-7">
        <p class="eyebrow text-terracotta">01 / Coiffures</p>
        <h2 class="mt-5 font-display text-[clamp(2.6rem,6vw,5.5rem)] font-light leading-[0.95] tracking-[-0.02em]">
          Des knotless <br class="hidden sm:block" />aux nattes enfant.
        </h2>
      </div>
      <p class="max-w-sm text-[15px] leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9">
        Choisissez ce que vous voulez faire, on vous montre les tresseuses qui le font, chez elles ou chez vous, avec le prix affiché avant de réserver.
      </p>
    </div>

    <div v-reveal.stagger class="mt-12 grid auto-rows-[minmax(11rem,auto)] grid-cols-2 gap-3 sm:gap-4 lg:mt-16 lg:grid-cols-12 lg:auto-rows-[15rem]">
      <!-- Tresses : grande tuile terracotta -->
      <RouterLink :to="to('box-braids')" class="tile col-span-2 row-span-2 bg-terracotta text-cream lg:col-span-5">
        <span class="tile-num text-cream/70">01</span>
        <div class="relative z-10 mt-auto">
          <p class="font-script text-4xl leading-none text-sand">box &amp; knotless</p>
          <p class="font-display text-[clamp(3.5rem,7vw,6.5rem)] font-light leading-[0.85] tracking-[-0.02em]">Braids</p>
          <p class="mt-3 max-w-[22ch] text-sm text-cream/75">Box braids, knotless, fines ou moyennes.</p>
        </div>
        <img :src="braidsImg" alt="" class="absolute right-5 top-5 h-40 w-32 rounded-t-full object-cover sm:h-56 sm:w-44 lg:right-8 lg:top-8 lg:h-72 lg:w-56" loading="lazy" />
        <ArrowUpRight class="tile-arrow" aria-hidden="true" />
      </RouterLink>

      <!-- Tresses homme : encre -->
      <RouterLink :to="to('homme')" class="tile col-span-2 bg-ink text-cream sm:col-span-1 lg:col-span-4">
        <img :src="barberImg" alt="" class="absolute inset-y-0 right-0 h-full w-1/2 object-cover object-top opacity-70 grayscale" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/10" aria-hidden="true" />
        <span class="tile-num text-copper">02</span>
        <p class="relative mt-auto font-display text-5xl font-light leading-none">Tresses homme</p>
        <p class="relative mt-2 text-sm text-cream/60">Nattes plaquées, vanilles, box braids.</p>
        <ArrowUpRight class="tile-arrow" aria-hidden="true" />
      </RouterLink>

      <!-- Locks : sable + illustration -->
      <RouterLink :to="to('locks')" class="tile col-span-1 row-span-2 bg-sand lg:col-span-3">
        <span class="tile-num text-terracotta">03</span>
        <img :src="afroImg" alt="" class="absolute inset-x-0 top-6 mx-auto w-[85%] mix-blend-multiply brightness-110 contrast-125" loading="lazy" />
        <p class="relative mt-auto font-display text-5xl font-light leading-none">Locks</p>
        <p class="relative mt-2 text-sm text-ink-soft">Départ, retwist, faux locs.</p>
        <ArrowUpRight class="tile-arrow" aria-hidden="true" />
      </RouterLink>

      <!-- Nattes : filet -->
      <RouterLink :to="to('nattes-collees')" class="tile col-span-1 border border-line bg-cream lg:col-span-4">
        <span class="tile-num text-terracotta">04</span>
        <p class="mt-auto font-display text-[1.85rem] font-light leading-[0.95] sm:text-5xl">Nattes collées <span class="italic text-terracotta">&amp;</span> cornrows</p>
        <ArrowUpRight class="tile-arrow" aria-hidden="true" />
      </RouterLink>
    </div>

    <div class="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-6">
      <span class="eyebrow text-ink-soft/70">Aussi</span>
      <RouterLink v-for="c in others" :key="c.slug" :to="to(c.slug)" class="inline-flex min-h-11 items-center font-display text-2xl transition-colors hover:text-terracotta">{{ c.label }}</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.tile {
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  border-radius: var(--radius-card); padding: 1.5rem;
  transition: transform 0.6s var(--ease-editorial);
}
@media (min-width: 1024px) { .tile { padding: 2rem; } }
.tile:hover { transform: translateY(-4px); }
.tile-num { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.2em; position: relative; z-index: 1; }
.tile-arrow {
  position: absolute; right: 1.5rem; bottom: 1.5rem; width: 1.5rem; height: 1.5rem; stroke-width: 1.4;
  transition: transform 0.5s var(--ease-editorial);
}
.tile:hover .tile-arrow { transform: translate(3px, -3px); }
</style>
