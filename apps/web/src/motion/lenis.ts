import Lenis from 'lenis'
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap'

let lenis: Lenis | null = null
const tick = (time: number) => lenis?.raf(time * 1000)

/** Active le defilement doux (pages publiques uniquement). Sans effet si reduced-motion. */
export function startLenis() {
  if (lenis || prefersReducedMotion()) return
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
}
export function stopLenis() {
  if (!lenis) return
  gsap.ticker.remove(tick)
  lenis.destroy()
  lenis = null
}
export const getLenis = () => lenis
