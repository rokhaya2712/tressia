<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LocateFixed, MapPin, Search, Star } from '@lucide/vue'
import { CITIES, formatEuro, type SalonCardDto } from '@tressia/shared'
import { gsap, SplitText, prefersReducedMotion } from '@/motion/gsap'
import heroImg from '@/assets/img/braiding-05.jpg'

defineProps<{ featured: SalonCardDto | null }>()

const router = useRouter()
const q = ref('')
const place = ref('')
const locating = ref(false)
const geoError = ref('')

function submit() {
  const [city, neighborhood] = place.value ? place.value.split('|') : []
  router.push({
    name: 'search',
    query: { ...(q.value.trim() && { q: q.value.trim() }), ...(city && { city }), ...(neighborhood && { neighborhood }) },
  })
}

function aroundMe() {
  geoError.value = ''
  if (!('geolocation' in navigator)) { geoError.value = 'La localisation n\'est pas disponible sur cet appareil.'; return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false
      router.push({ name: 'search', query: { lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) } })
    },
    () => { locating.value = false; geoError.value = 'Position refusée. Choisissez plutôt un quartier.' },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  )
}

const root = ref<HTMLElement>()
const title = ref<HTMLElement>()
const media = ref<HTMLElement>()
let ctx: gsap.Context | null = null
let split: SplitText | null = null

onMounted(async () => {
  await document.fonts?.ready
  if (!root.value) return
  ctx = gsap.context(() => {
    const reduce = prefersReducedMotion()
    if (reduce) {
      gsap.from('[data-hero-fade]', { autoAlpha: 0, duration: 0.4, stagger: 0.05 })
      return
    }
    split = SplitText.create(title.value!, { type: 'words', mask: 'words' })
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
    tl.from(media.value!, { clipPath: 'inset(8% 6% 8% 6% round 2.5rem)', duration: 1.4 })
      .from(split.words, { yPercent: 110, duration: 1.1, stagger: 0.07 }, 0.15)
      .from('[data-hero-script]', { autoAlpha: 0, rotate: -14, y: 20, duration: 1.2 }, 0.7)
      .from('[data-hero-fade]', { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.08 }, 0.6)

    gsap.to('[data-hero-img]', {
      scale: 1.12, yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: root.value, start: 'top top', end: 'bottom top', scrub: true },
    })
  }, root.value)
})

onBeforeUnmount(() => { split?.revert(); ctx?.revert() })
</script>

<template>
  <section ref="root" class="px-3 pb-6 sm:px-5 lg:px-6">
    <div ref="media" class="relative overflow-hidden rounded-[2rem] bg-ink lg:rounded-[2.5rem]">
      <!-- Photo : tressage à la main, voile encre à gauche pour la lisibilité -->
      <div class="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          data-hero-img
          :src="heroImg"
          alt=""
          class="absolute inset-0 size-full object-cover object-[62%_35%]"
          fetchpriority="high"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/60 to-ink/40 lg:bg-gradient-to-r lg:from-ink/85 lg:via-ink/45 lg:to-ink/0" />
      </div>
      <div class="grain-layer" aria-hidden="true" />

      <div class="relative z-10 flex min-h-[min(calc(100svh-6.5rem),54rem)] lg:min-h-[min(calc(100svh-6.5rem),58rem)] flex-col px-5 pb-6 pt-10 sm:px-10 lg:px-16 lg:pb-10 lg:pt-16">
        <p data-hero-fade class="eyebrow text-sand">Mulhouse · Colmar · Strasbourg</p>

        <div class="relative mt-6 w-fit lg:mt-8">
          <h1 ref="title" class="max-w-[13.5ch] font-display text-[clamp(3rem,7.2vw,7rem)] font-light leading-[0.9] tracking-[-0.025em] text-cream">
            Votre prochaine coiffure, à deux rues d'ici.
          </h1>
          <span data-hero-script class="pointer-events-none absolute -bottom-8 right-2 lg:right-auto lg:left-[34%] lg:-bottom-14 select-none font-script text-[clamp(2.6rem,5vw,5rem)] leading-none text-gold -rotate-6" aria-hidden="true">tout près</span>
        </div>

        <p data-hero-fade class="mt-12 max-w-md text-[15px] leading-relaxed text-cream/80 sm:mt-16 sm:text-base">
          Des tresseuses près de chez vous, chez elles ou à domicile, avec leurs prix et leurs heures libres. Vous choisissez le créneau, c’est confirmé.
        </p>

        <div class="mt-auto grid gap-6 pt-10 lg:grid-cols-12 lg:items-end">
          <!-- Recherche -->
          <form data-hero-fade class="lg:col-span-8 xl:col-span-7" role="search" @submit.prevent="submit">
            <div class="flex flex-col gap-2 rounded-[1.6rem] bg-cream p-2 shadow-[0_24px_60px_-30px_rgb(23_17_15/0.45)] sm:flex-row sm:items-center sm:rounded-full">
              <label class="flex min-h-12 flex-1 items-center gap-3 px-4">
                <Search class="size-4 shrink-0 text-ink-soft" :stroke-width="1.6" aria-hidden="true" />
                <span class="sr-only">Coiffure ou tresseuse</span>
                <input v-model="q" type="search" placeholder="Tresses, coupe, salon..." class="w-full bg-transparent py-3 text-[15px] placeholder:text-ink-soft/60 focus:outline-none" />
              </label>
              <span class="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
              <label class="flex min-h-12 items-center gap-3 border-t border-line px-4 sm:border-t-0 sm:pr-2">
                <MapPin class="size-4 shrink-0 text-ink-soft" :stroke-width="1.6" aria-hidden="true" />
                <span class="sr-only">Quartier</span>
                <select v-model="place" class="w-full cursor-pointer appearance-none bg-transparent py-3 pr-2 text-[15px] focus:outline-none sm:w-44">
                  <option value="">Tous les quartiers</option>
                  <optgroup v-for="(hoods, city) in CITIES" :key="city" :label="String(city)">
                    <option v-for="n in hoods" :key="n" :value="`${city}|${n}`">{{ n }}</option>
                  </optgroup>
                </select>
              </label>
              <button type="submit" class="h-12 rounded-full bg-ink px-7 text-sm font-semibold tracking-wide text-cream transition-colors duration-300 hover:bg-terracotta">Chercher</button>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-2">
              <button type="button" class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-cream underline decoration-cream/40 decoration-1 underline-offset-[6px] transition-colors hover:decoration-cream disabled:opacity-60" :disabled="locating" @click="aroundMe">
                <LocateFixed class="size-4" :class="locating && 'animate-pulse'" :stroke-width="1.6" aria-hidden="true" />
                {{ locating ? 'Localisation...' : 'Autour de moi' }}
              </button>
              <p v-if="geoError" class="text-sm text-sand" role="status">{{ geoError }}</p>
            </div>
          </form>

          <!-- Carte verre, seulement si l'API a répondu -->
          <RouterLink
            v-if="featured"
            data-hero-fade
            :to="{ name: 'salon', params: { slug: featured.slug } }"
            class="group hidden rounded-[1.5rem] border border-cream/25 bg-cream/10 p-5 text-cream shadow-[0_30px_60px_-40px_rgb(23_17_15/0.7)] backdrop-blur-2xl transition-colors duration-500 hover:bg-cream/20 lg:col-span-4 lg:col-start-9 lg:block xl:col-span-4 xl:col-start-9"
          >
            <div class="flex items-center justify-between">
              <p class="eyebrow text-sand">Réservable aujourd'hui</p>
              <span class="size-2 rounded-full bg-gold" aria-hidden="true" />
            </div>
            <p class="mt-4 font-display text-3xl leading-tight">{{ featured.name }}</p>
            <p class="mt-1 text-sm text-cream/70">{{ featured.neighborhood }}, {{ featured.city }}</p>
            <div class="mt-5 flex items-center justify-between border-t border-cream/20 pt-4 text-sm">
              <span v-if="featured.rating" class="inline-flex items-center gap-1.5"><Star class="size-3.5 fill-copper text-copper" aria-hidden="true" />{{ featured.rating.toFixed(1) }} <span class="text-cream/60">({{ featured.reviewCount }})</span></span>
              <span v-if="featured.minPriceEur">dès {{ formatEuro(featured.minPriceEur) }}</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

