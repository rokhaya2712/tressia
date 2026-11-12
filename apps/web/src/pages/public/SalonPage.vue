<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AUDIENCE_LABELS, CATEGORIES, SERVICE_MODE_LABELS, TIMEZONE, acceptsAtHer, acceptsHome, formatEuro, formatDuration, type ReviewDto, type SalonDetailDto, type StaffTodayDto } from '@tressia/shared'
import { Car, Home, MapPin, MessageCircle, Phone, Star } from '@lucide/vue'
import { publicApi } from '@/api/public'
import { ApiError } from '@/api/http'
import UiButton from '@/components/ui/UiButton.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import ServiceRow from '@/components/public/salon/ServiceRow.vue'
import StaffArch from '@/components/public/salon/StaffArch.vue'
import StarRow from '@/components/public/salon/StarRow.vue'
import SalonMap from '@/components/public/search/SalonMap.vue'
import { telLink, waLink } from '@/composables/format'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const salon = ref<SalonDetailDto | null>(null)
const reviews = ref<ReviewDto[]>([])
const staffToday = ref<StaffTodayDto[]>([])
const loading = ref(true)
const notFound = ref(false)
const error = ref('')
const selected = ref<number[]>([])

async function load() {
  loading.value = true; error.value = ''; notFound.value = false
  try {
    salon.value = await publicApi.salon(slug.value)
    document.title = `${salon.value.name} | Tressia`
    publicApi.reviews(slug.value).then((r) => (reviews.value = r)).catch(() => {})
    publicApi.staffToday(slug.value).then((r) => (staffToday.value = r)).catch(() => {})
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound.value = true
    else error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
watch(slug, load, { immediate: true })

const WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const todayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(new Date()))
const week = computed(() =>
  [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    d,
    label: WEEK[d]!,
    slots: (salon.value?.hours ?? []).filter((h) => h.weekday === d).sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
  })),
)

const groups = computed(() => {
  const s = salon.value
  if (!s) return []
  const map = new Map<string, typeof s.services>()
  for (const sv of [...s.services].sort((a, b) => a.position - b.position)) {
    if (!map.has(sv.categorySlug)) map.set(sv.categorySlug, [])
    map.get(sv.categorySlug)!.push(sv)
  }
  return [...map.entries()].map(([slug, items]) => ({
    slug,
    label: CATEGORIES.find((c) => c.slug === slug)?.label ?? slug,
    items,
  }))
})

function toggle(id: number) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
const chosen = computed(() => salon.value?.services.filter((s) => selected.value.includes(s.id)) ?? [])
const total = computed(() => chosen.value.reduce((a, s) => a + s.priceEur, 0))
const totalMin = computed(() => chosen.value.reduce((a, s) => a + s.durationMin, 0))
const bookingTo = computed(() => ({ name: 'booking', params: { slug: slug.value }, query: selected.value.length ? { services: selected.value.join(',') } : {} }))
const wa = computed(() => waLink(salon.value?.whatsapp, salon.value ? `Bonjour ${salon.value.name}, je vous contacte depuis Tressia.` : undefined))
const tel = computed(() => telLink(salon.value?.phone))
const point = computed(() =>
  salon.value?.lat != null && salon.value.lng != null ? [{ id: salon.value.id, lat: salon.value.lat, lng: salon.value.lng, label: salon.value.name, sub: `${salon.value.neighborhood}, ${salon.value.city}` }] : [],
)
const photos = computed(() => [...(salon.value?.photos ?? [])].sort((a, b) => a.position - b.position))
</script>

<template>
  <div class="grain min-h-screen bg-cream pt-24 md:pt-28" :class="selected.length ? 'pb-32' : 'pb-20'">
    <div v-if="loading" class="grid min-h-[60vh] place-items-center"><UiSpinner /></div>

    <div v-else-if="notFound" class="mx-auto max-w-xl px-4 py-24 text-center">
      <p class="eyebrow text-copper">Tresseuse introuvable</p>
      <h1 class="mt-3 font-display text-5xl">Ce profil n’existe plus.</h1>
      <p class="mt-3 text-ink-soft">La tresseuse a peut-être changé de nom ou son profil n’est pas encore publié.</p>
      <UiButton class="mt-8" variant="ink" :to="{ name: 'search' }">Voir les tresseuses</UiButton>
    </div>

    <div v-else-if="error" class="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 class="font-display text-4xl">Impossible de charger ce profil.</h1>
      <p class="mt-3 text-ink-soft">{{ error }}</p>
      <UiButton class="mt-8" variant="outline" @click="load">Réessayer</UiButton>
    </div>

    <article v-else-if="salon" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <!-- Couverture -->
      <div class="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-sand sm:aspect-[16/7]">
        <img v-if="salon.coverUrl" :src="salon.coverUrl" :alt="`Coiffure réalisée par ${salon.name}`" class="size-full object-cover" />
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent" aria-hidden="true" />
        <p class="eyebrow absolute bottom-6 left-6 text-cream/90">{{ AUDIENCE_LABELS[salon.audience] }} <span class="mx-2">/</span> {{ salon.neighborhood }}</p>
      </div>

      <!-- Identité -->
      <header class="mt-8 grid gap-8 border-b border-line pb-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div>
          <p class="eyebrow text-copper">{{ salon.neighborhood }}, {{ salon.city }}</p>
          <h1 class="mt-3 font-display text-[3.2rem] leading-[0.9] text-ink sm:text-7xl lg:text-8xl">{{ salon.name }}</h1>
          <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span v-if="salon.rating != null" class="flex items-center gap-1.5 font-semibold">
              <Star class="size-4 fill-copper text-copper" aria-hidden="true" />{{ salon.rating.toFixed(1).replace('.', ',') }}
              <a href="#avis" class="font-normal text-ink-soft underline decoration-line underline-offset-4">{{ salon.reviewCount }} avis</a>
            </span>
            <span v-if="salon.minPriceEur != null" class="text-ink-soft">Coiffures dès {{ formatEuro(salon.minPriceEur) }}</span>
          </div>
          <p v-if="salon.description" class="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{{ salon.description }}</p>
        </div>
        <div class="space-y-5">
          <ul class="space-y-3 text-ink-soft">
            <li v-if="acceptsAtHer(salon.serviceMode)" class="flex items-start gap-3"><Home class="mt-0.5 size-5 shrink-0 text-copper" aria-hidden="true" /><span>Reçoit chez elle, {{ salon.neighborhood }}, {{ salon.city }}<span class="block text-sm text-ink-soft/70">L’adresse exacte vous est envoyée après la réservation.</span></span></li>
            <li v-if="acceptsHome(salon.serviceMode)" class="flex items-start gap-3"><Car class="mt-0.5 size-5 shrink-0 text-copper" aria-hidden="true" /><span>Se déplace chez vous{{ salon.travelFeeEur ? ` (+ ${formatEuro(salon.travelFeeEur)} de déplacement)` : ' (déplacement offert)' }}<span class="block text-sm text-ink-soft/70">{{ salon.travelZone.join(', ') }}</span></span></li>
          </ul>
          <div class="flex flex-wrap gap-2">
            <UiButton v-if="tel" variant="outline" :href="tel"><Phone class="size-4" aria-hidden="true" />Appeler</UiButton>
            <UiButton v-if="wa" variant="outline" :href="wa" target="_blank" rel="noopener"><MessageCircle class="size-4" aria-hidden="true" />WhatsApp</UiButton>
            <UiButton variant="terracotta" :to="bookingTo">Réserver</UiButton>
          </div>
          <div class="rounded-2xl border border-line p-5">
            <p class="eyebrow mb-3 text-ink-soft">Disponibilités</p>
            <ul class="divide-y divide-line/70 text-sm">
              <li v-for="w in week" :key="w.d" class="flex justify-between py-2" :class="w.d === todayIdx ? 'font-semibold text-ink' : 'text-ink-soft'">
                <span class="flex items-center gap-2">{{ w.label }}<span v-if="w.d === todayIdx" class="rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-cream">aujourd’hui</span></span>
                <span v-if="w.slots.length">{{ w.slots.map((s) => `${s.opensAt} à ${s.closesAt}`).join(', ') }}</span>
                <span v-else class="text-ink-soft/50">Fermé</span>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Catalogue -->
      <section class="mt-16" aria-labelledby="carte-title">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="eyebrow text-copper">Ses coiffures</p>
            <h2 id="carte-title" class="mt-2 font-display text-5xl sm:text-6xl">Coiffures</h2>
          </div>
          <p class="hidden max-w-xs text-right text-sm text-ink-soft sm:block">Cochez une ou plusieurs coiffures, le total s’ajuste en bas de page.</p>
        </div>
        <p v-if="!groups.length" class="mt-8 text-ink-soft">Elle n’a pas encore publié ses coiffures.</p>
        <div v-for="g in groups" :key="g.slug" class="mt-10">
          <h3 class="eyebrow border-b border-ink pb-3 text-ink">{{ g.label }} <span class="text-ink-soft/60">({{ g.items.length }})</span></h3>
          <ServiceRow v-for="s in g.items" :key="s.id" :service="s" :selected="selected.includes(s.id)" @toggle="toggle(s.id)" />
        </div>
      </section>

      <!-- Disponibilite du jour -->
      <section v-if="salon.staff.length" class="mt-20" aria-labelledby="team-title">
        <p class="eyebrow text-copper">Aujourd’hui</p>
        <h2 id="team-title" class="mt-2 font-display text-5xl sm:text-6xl">{{ salon.staff.length > 1 ? 'L’équipe' : 'Disponibilité' }}</h2>
        <div class="-mx-4 mt-8 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0" data-lenis-prevent>
          <div class="flex w-max gap-6">
            <StaffArch v-for="st in salon.staff" :key="st.id" :staff="st" :today="staffToday.find((t) => t.staffId === st.id)" />
          </div>
        </div>
      </section>

      <!-- Galerie -->
      <section v-if="photos.length" class="mt-20" aria-labelledby="gal-title">
        <p class="eyebrow text-copper">Réalisations</p>
        <h2 id="gal-title" class="mt-2 font-display text-5xl sm:text-6xl">Galerie</h2>
        <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          <div v-for="(p, i) in photos" :key="p.id" class="overflow-hidden rounded-2xl bg-sand" :class="i === 0 ? 'col-span-2 row-span-2 aspect-square sm:col-span-2' : 'aspect-square'">
            <img :src="p.url" :alt="`Réalisation ${i + 1} de ${salon.name}`" loading="lazy" class="size-full object-cover transition duration-700 hover:scale-105" />
          </div>
        </div>
      </section>

      <!-- Avis + carte -->
      <section class="mt-20 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div id="avis">
          <p class="eyebrow text-copper">Elles et ils sont venus</p>
          <h2 class="mt-2 font-display text-5xl sm:text-6xl">Avis</h2>
          <p v-if="!reviews.length" class="mt-6 text-ink-soft">Pas encore d’avis. Le premier rendez-vous honoré ouvrira le livre d’or.</p>
          <ul class="mt-6 divide-y divide-line border-y border-line">
            <li v-for="r in reviews.slice(0, 8)" :key="r.id" class="py-6">
              <div class="flex items-center justify-between gap-4">
                <p class="font-semibold">{{ r.authorName }}</p>
                <StarRow :value="r.rating" />
              </div>
              <p v-if="r.comment" class="mt-2 font-display text-xl italic leading-snug text-ink-soft">« {{ r.comment }} »</p>
              <p class="mt-2 text-xs text-ink-soft/60">{{ new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
            </li>
          </ul>
        </div>
        <div v-if="point.length">
          <p class="eyebrow text-copper">{{ SERVICE_MODE_LABELS[salon.serviceMode] }}</p>
          <h2 class="mt-2 font-display text-5xl sm:text-6xl">Secteur</h2>
          <div class="mt-6 h-80 overflow-hidden rounded-[var(--radius-card)] border border-line">
            <SalonMap :points="point" :zoom="13" />
          </div>
          <p class="mt-3 flex items-center gap-2 text-sm text-ink-soft"><MapPin class="size-4 text-copper" aria-hidden="true" />Position approximative, pour protéger la vie privée de la tresseuse.</p>
        </div>
      </section>
    </article>

    <!-- Barre de réservation -->
    <Transition enter-from-class="translate-y-full" leave-to-class="translate-y-full">
      <div v-if="salon && selected.length" class="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ink text-cream transition-transform duration-500 ease-[var(--ease-editorial)]">
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <p class="min-w-0 text-sm">
            <span class="block text-cream/70">{{ selected.length }} {{ selected.length > 1 ? 'coiffures' : 'coiffure' }} <span aria-hidden="true">·</span> {{ formatDuration(totalMin) }}</span>
            <span class="font-display text-2xl">{{ formatEuro(total) }}</span>
          </p>
          <UiButton variant="copper" size="lg" :to="bookingTo">Réserver</UiButton>
        </div>
      </div>
    </Transition>
  </div>
</template>
