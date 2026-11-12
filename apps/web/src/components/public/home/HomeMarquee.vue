<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap, prefersReducedMotion } from '@/motion/gsap'

const root = ref<HTMLElement>()
let ctx: gsap.Context | null = null
const words = Array.from({ length: 6 })

onMounted(() => {
  if (!root.value || prefersReducedMotion()) return
  ctx = gsap.context(() => {
    const st = { trigger: root.value, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    gsap.fromTo('[data-row="a"]', { xPercent: 0 }, { xPercent: -25, ease: 'none', scrollTrigger: st })
    gsap.fromTo('[data-row="b"]', { xPercent: -25 }, { xPercent: 0, ease: 'none', scrollTrigger: st })
  }, root.value)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section ref="root" class="relative overflow-hidden bg-terracotta py-16 text-cream lg:py-24" aria-label="Tressia">
    <div class="select-none font-display font-light leading-[0.82] tracking-[-0.03em]" aria-hidden="true">
      <div data-row="a" class="flex whitespace-nowrap text-[clamp(5rem,17vw,16rem)] text-cream/15">
        <span v-for="(_, i) in words" :key="i" class="pr-[0.25em]">TRESSIA</span>
      </div>
      <div data-row="b" class="flex whitespace-nowrap text-[clamp(5rem,17vw,16rem)] italic text-transparent [-webkit-text-stroke:1px_rgb(243_236_227/0.45)]">
        <span v-for="(_, i) in words" :key="i" class="pr-[0.25em]">Tressia</span>
      </div>
    </div>
    <div class="relative mx-auto mt-10 flex lg:mt-14 max-w-[1440px] flex-col gap-4 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
      <p class="max-w-xl font-display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.05]">
        Mulhouse Centre, Rebberg, Dornach, Colmar, Krutenau, Neudorf. <span class="font-script text-sand">Et le vôtre.</span>
      </p>
      <p class="eyebrow text-cream/70">Une tresseuse, chez elle ou chez vous</p>
    </div>
  </section>
</template>
