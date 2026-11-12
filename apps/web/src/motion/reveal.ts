import type { Directive } from 'vue'
import { gsap, prefersReducedMotion } from './gsap'

/**
 * v-reveal : apparition au scroll (fondu + translation 24px). Le contenu reste visible sans JS
 * car l'etat initial est pose par GSAP. Valeur optionnelle = delai en secondes.
 * v-reveal.stagger : anime les enfants directs en cascade.
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    const reduce = prefersReducedMotion()
    const targets = binding.modifiers.stagger ? Array.from(el.children) : el
    const tween = gsap.from(targets, {
      autoAlpha: 0,
      y: reduce ? 0 : 24,
      duration: reduce ? 0.3 : 0.9,
      ease: 'expo.out',
      delay: binding.value ?? 0,
      stagger: binding.modifiers.stagger ? 0.08 : 0,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    })
    ;(el as HTMLElement & { _reveal?: gsap.core.Tween })._reveal = tween
  },
  unmounted(el) {
    const t = (el as HTMLElement & { _reveal?: gsap.core.Tween })._reveal
    t?.scrollTrigger?.kill()
    t?.kill()
  },
}
