<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  TIMEZONE, acceptsAtHer, acceptsHome, formatDayLong, formatDuration, formatEuro, formatTime, MAX_HORIZON_DAYS,
  type AvailabilityDto, type BookingDto, type BookingLocation, type SalonDetailDto,
} from '@tressia/shared'
import { ArrowLeft, Car, Check, Home, MessageCircle } from '@lucide/vue'
import { publicApi } from '@/api/public'
import { bookingsApi } from '@/api/bookings'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { inputClass, textareaClass } from '@/components/ui/fields'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import StepHead from '@/components/public/booking/StepHead.vue'
import AuthForm from '@/components/public/auth/AuthForm.vue'
import { dayToIso, initials, localDay, waLink } from '@/composables/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const slug = computed(() => String(route.params.slug))

const salon = ref<SalonDetailDto | null>(null)
const loading = ref(true)
const loadError = ref('')

// Sélection (miroir de la query string)
const q = route.query
const serviceIds = ref<number[]>(typeof q.services === 'string' ? q.services.split(',').map(Number).filter((n) => n > 0) : [])
const staffId = ref<number | null>(typeof q.staff === 'string' && Number(q.staff) > 0 ? Number(q.staff) : null)
const day = ref<string>(typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : '')
const slot = ref<string>(typeof q.slot === 'string' ? q.slot : '')
const note = ref('')
const location = ref<BookingLocation>(q.lieu === 'domicile' ? 'domicile' : 'chez_tresseuse')
const clientCity = ref(typeof q.ville === 'string' ? q.ville : '')
const clientAddress = ref('')

const DAYS = Math.min(14, MAX_HORIZON_DAYS)
const days = Array.from({ length: DAYS }, (_, i) => localDay(i))
const avail = ref<Record<string, AvailabilityDto | 'error' | undefined>>({})
const availLoading = ref(false)
let availToken = 0

const submitting = ref(false)
const submitError = ref('')
const slotTaken = ref(false)
const needAuth = ref(false)
const authMode = ref<'login' | 'register'>('login')
const booking = ref<BookingDto | null>(null)

function syncQuery() {
  const query: Record<string, string> = {}
  if (serviceIds.value.length) query.services = serviceIds.value.join(',')
  if (staffId.value) query.staff = String(staffId.value)
  if (day.value) query.date = day.value
  if (slot.value) query.slot = slot.value
  if (location.value === 'domicile') query.lieu = 'domicile'
  if (clientCity.value) query.ville = clientCity.value
  // Pas de router.replace : il déclencherait le retour en haut de page à chaque choix.
  const loc = router.resolve({ name: 'booking', params: { slug: slug.value }, query })
  window.history.replaceState({ ...window.history.state, current: loc.fullPath }, '', loc.href)
}

onMounted(async () => {
  try {
    salon.value = await publicApi.salon(slug.value)
    const valid = new Set(salon.value.services.map((s) => s.id))
    const kept = serviceIds.value.filter((id) => valid.has(id))
    if (kept.length !== serviceIds.value.length) serviceIds.value = kept
    if (staffId.value && !salon.value.staff.some((s) => s.id === staffId.value)) staffId.value = null
    const mode = salon.value.serviceMode
    if (!acceptsHome(mode)) location.value = 'chez_tresseuse'
    if (!acceptsAtHer(mode)) location.value = 'domicile'
    if (clientCity.value && !salon.value.travelZone.includes(clientCity.value)) clientCity.value = ''
    if (!clientCity.value && salon.value.travelZone.length === 1) clientCity.value = salon.value.travelZone[0]!
    document.title = `Réserver chez ${salon.value.name} | Tressia`
    loadAvailability()
  } catch (e) {
    loadError.value = e instanceof ApiError && e.status === 404 ? 'Cette tresseuse est introuvable.' : 'Impossible de charger ce profil.'
  } finally {
    loading.value = false
  }
})

async function loadAvailability() {
  const token = ++availToken
  avail.value = {}
  if (!serviceIds.value.length || !salon.value) return
  availLoading.value = true
  const ids = [...serviceIds.value]
  await Promise.all(
    days.map(async (d) => {
      try {
        const r = await publicApi.availability(slug.value, d, ids, staffId.value)
        if (token === availToken) avail.value = { ...avail.value, [d]: r }
      } catch {
        if (token === availToken) avail.value = { ...avail.value, [d]: 'error' }
      }
    }),
  )
  if (token !== availToken) return
  availLoading.value = false
  // Choisit un jour par défaut, et invalide un créneau qui n'existe plus
  if (!day.value || !slotsOf(day.value).length) {
    if (!day.value) day.value = days.find((d) => slotsOf(d).length) ?? ''
  }
  if (slot.value && !slotsOf(day.value).some((s) => s.startsAt === slot.value)) slot.value = ''
  syncQuery()
}

function slotsOf(d: string) {
  const a = avail.value[d]
  return a && a !== 'error' ? a.slots : []
}

watch([serviceIds, staffId], () => { slot.value = ''; loadAvailability() }, { deep: true })
watch(day, () => { slot.value = ''; syncQuery() })
watch(slot, (v) => { if (v) slotTaken.value = false })
watch(slot, syncQuery)
watch([location, clientCity], syncQuery)

const services = computed(() => salon.value?.services ?? [])
const chosen = computed(() => services.value.filter((s) => serviceIds.value.includes(s.id)))
const subtotal = computed(() => chosen.value.reduce((a, s) => a + s.priceEur, 0))
const atHome = computed(() => location.value === 'domicile')
const travelFee = computed(() => (atHome.value ? salon.value?.travelFeeEur ?? 0 : 0))
const total = computed(() => subtotal.value + travelFee.value)
const bothModes = computed(() => !!salon.value && acceptsHome(salon.value.serviceMode) && acceptsAtHer(salon.value.serviceMode))
const placeOk = computed(() => !atHome.value || (!!clientCity.value && clientAddress.value.trim().length >= 5))
const placeSummary = computed(() => (atHome.value ? (clientCity.value ? `À domicile, ${clientCity.value}` : 'À domicile') : `Chez ${salon.value?.name ?? 'la tresseuse'}, ${salon.value?.neighborhood ?? ''}`))
const totalMin = computed(() => chosen.value.reduce((a, s) => a + s.durationMin, 0))
const staffName = computed(() => salon.value?.staff.find((s) => s.id === staffId.value)?.name ?? 'Sans préférence')

function toggleService(id: number) {
  serviceIds.value = serviceIds.value.includes(id) ? serviceIds.value.filter((x) => x !== id) : [...serviceIds.value, id]
}

function hourOf(iso: string) { return Number(formatTime(iso).slice(0, 2)) }
const periods = computed(() => {
  const all = slotsOf(day.value)
  return [
    { label: 'Matin', items: all.filter((s) => hourOf(s.startsAt) < 12) },
    { label: 'Après-midi', items: all.filter((s) => hourOf(s.startsAt) >= 12 && hourOf(s.startsAt) < 17) },
    { label: 'Soir', items: all.filter((s) => hourOf(s.startsAt) >= 17) },
  ].filter((p) => p.items.length)
})
const dayParts = (d: string) => {
  const date = new Date(dayToIso(d))
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: TIMEZONE, ...o }).format(date)
  return { wd: fmt({ weekday: 'short' }).replace('.', ''), n: fmt({ day: 'numeric' }), m: fmt({ month: 'short' }).replace('.', '') }
}
const canConfirm = computed(() => chosen.value.length > 0 && !!slot.value && placeOk.value)

async function confirm() {
  if (!salon.value || !canConfirm.value) return
  submitError.value = ''
  slotTaken.value = false
  if (!auth.user) { needAuth.value = true; return }
  submitting.value = true
  try {
    const res = await bookingsApi.create({
      salonId: salon.value.id,
      serviceIds: serviceIds.value,
      staffId: staffId.value,
      startsAt: slot.value,
      note: note.value.trim() || undefined,
      location: location.value,
      ...(atHome.value ? { clientAddress: clientAddress.value.trim(), clientCity: clientCity.value } : {}),
    })
    booking.value = res.booking
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'slot_taken') {
      slotTaken.value = true
      slot.value = ''
      loadAvailability()
    } else if (e instanceof ApiError && e.status === 401) {
      needAuth.value = true
    } else {
      submitError.value = e instanceof Error ? e.message : 'La réservation n’a pas pu être enregistrée.'
    }
  } finally {
    submitting.value = false
  }
}

function onAuthed() {
  needAuth.value = false
  confirm()
}

const wa = computed(() => waLink(booking.value?.salon.whatsapp ?? salon.value?.whatsapp, booking.value ? `Bonjour, j’ai réservé sur Tressia pour le ${formatDayLong(booking.value.startsAt)} à ${formatTime(booking.value.startsAt)}.` : undefined))
</script>

<template>
  <div class="grain min-h-screen bg-cream pb-28 pt-24 md:pt-28">
    <div v-if="loading" class="grid min-h-[60vh] place-items-center"><UiSpinner /></div>
    <div v-else-if="loadError || !salon" class="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 class="font-display text-4xl">{{ loadError }}</h1>
      <UiButton class="mt-8" variant="ink" :to="{ name: 'search' }">Voir les tresseuses</UiButton>
    </div>

    <!-- Succès -->
    <section v-else-if="booking" class="mx-auto max-w-2xl px-4 py-6 text-center sm:px-6" aria-live="polite">
      <span class="mx-auto grid size-16 place-items-center rounded-full bg-sage text-cream"><Check class="size-8" aria-hidden="true" /></span>
      <p class="eyebrow mt-8 text-copper">Rendez-vous confirmé</p>
      <h1 class="mt-3 font-display text-5xl leading-[0.95] sm:text-7xl">À <em class="text-terracotta">{{ formatDayLong(booking.startsAt) }}</em></h1>
      <p class="mt-4 font-display text-4xl">{{ formatTime(booking.startsAt) }}</p>
      <div class="mx-auto mt-10 max-w-md divide-y divide-line border-y border-line text-left text-sm">
        <p class="flex justify-between gap-4 py-3"><span class="text-ink-soft">Tresseuse</span><strong class="text-right">{{ booking.salon.name }}</strong></p>
        <p v-if="booking.location === 'domicile'" class="flex justify-between gap-4 py-3"><span class="text-ink-soft">Chez vous</span><span class="text-right">{{ booking.clientAddress }}, {{ booking.clientCity }}</span></p>
        <p v-else class="flex justify-between gap-4 py-3"><span class="text-ink-soft">Adresse</span><span class="text-right">{{ booking.salon.address }}, {{ booking.salon.neighborhood }}, {{ booking.salon.city }}</span></p>
        <p v-for="it in booking.items" :key="it.serviceId" class="flex justify-between gap-4 py-3"><span>{{ it.name }}</span><span>{{ formatEuro(it.priceEur) }}</span></p>
        <p v-if="booking.travelFeeEur" class="flex justify-between gap-4 py-3"><span>Frais de déplacement</span><span>{{ formatEuro(booking.travelFeeEur) }}</span></p>
        <p class="flex justify-between gap-4 py-3 text-base"><span class="font-semibold">Total, à régler sur place</span><strong>{{ formatEuro(booking.totalPriceEur) }}</strong></p>
      </div>
      <p class="mt-6 text-sm text-ink-soft">Ce rendez-vous est déjà enregistré dans vos rendez-vous. Vous pouvez l’annuler jusqu’à 2 h avant.</p>
      <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <UiButton variant="ink" size="lg" :to="{ name: 'my-bookings' }">Mes rendez-vous</UiButton>
        <UiButton v-if="wa" variant="outline" size="lg" :href="wa" target="_blank" rel="noopener"><MessageCircle class="size-4" aria-hidden="true" />Écrire à la tresseuse</UiButton>
      </div>
    </section>

    <!-- Tunnel -->
    <div v-else class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <RouterLink :to="{ name: 'salon', params: { slug } }" class="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft class="size-4" aria-hidden="true" />{{ salon.name }}
      </RouterLink>
      <h1 class="mt-2 font-display text-5xl leading-[0.95] sm:text-7xl">Réserver <em class="text-terracotta">chez</em> {{ salon.name }}</h1>

      <div class="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div class="space-y-14">
          <!-- 01 Coiffures -->
          <section aria-labelledby="s1">
            <StepHead id="s1" n="01" title="Coiffures" :done="chosen.length > 0" :summary="chosen.length ? `${chosen.length} choisie${chosen.length > 1 ? 's' : ''}, ${formatDuration(totalMin)}` : 'Choisissez au moins une coiffure'" />
            <ul class="mt-4 divide-y divide-line">
              <li v-for="s in services" :key="s.id">
                <label class="flex min-h-14 cursor-pointer items-center gap-4 py-3">
                  <input type="checkbox" class="size-5 shrink-0 accent-terracotta" :checked="serviceIds.includes(s.id)" @change="toggleService(s.id)" />
                  <span class="min-w-0 flex-1">
                    <span class="block font-display text-xl uppercase leading-tight tracking-wide">{{ s.name }}</span>
                    <span class="text-sm text-ink-soft">{{ formatDuration(s.durationMin) }}</span>
                  </span>
                  <span class="shrink-0 text-sm font-semibold">{{ formatEuro(s.priceEur) }}</span>
                </label>
              </li>
            </ul>
          </section>

          <!-- 02 Lieu -->
          <section aria-labelledby="s2">
            <StepHead id="s2" n="02" title="Lieu" :done="placeOk" :summary="placeSummary" />
            <div v-if="bothModes" class="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Lieu du rendez-vous">
              <button
                type="button" role="radio" :aria-checked="!atHome"
                class="flex items-start gap-3 rounded-2xl border p-4 text-left transition"
                :class="!atHome ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'"
                @click="location = 'chez_tresseuse'"
              >
                <Home class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span><span class="block font-semibold">Chez la tresseuse</span><span class="text-sm opacity-75">{{ salon.neighborhood }}, {{ salon.city }}. Sans frais.</span></span>
              </button>
              <button
                type="button" role="radio" :aria-checked="atHome"
                class="flex items-start gap-3 rounded-2xl border p-4 text-left transition"
                :class="atHome ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'"
                @click="location = 'domicile'"
              >
                <Car class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span><span class="block font-semibold">À domicile</span><span class="text-sm opacity-75">{{ salon.travelFeeEur ? `+ ${formatEuro(salon.travelFeeEur)} de déplacement` : 'Déplacement offert' }}</span></span>
              </button>
            </div>
            <p v-else-if="atHome" class="mt-5 flex items-center gap-2 text-ink-soft"><Car class="size-5 text-copper" aria-hidden="true" />{{ salon.name }} se déplace uniquement à domicile{{ salon.travelFeeEur ? ` (+ ${formatEuro(salon.travelFeeEur)})` : '' }}.</p>
            <p v-else class="mt-5 flex items-center gap-2 text-ink-soft"><Home class="size-5 text-copper" aria-hidden="true" />Chez {{ salon.name }}, {{ salon.neighborhood }}, {{ salon.city }}. L’adresse exacte vous est envoyée après la réservation.</p>
            <div v-if="atHome" class="mt-5 grid gap-4 sm:grid-cols-[1fr_1.4fr]">
              <UiField label="Commune" for="client-city">
                <select id="client-city" v-model="clientCity" :class="inputClass">
                  <option value="" disabled>Choisir</option>
                  <option v-for="c in salon.travelZone" :key="c" :value="c">{{ c }}</option>
                </select>
              </UiField>
              <UiField label="Adresse" for="client-address" hint="Visible seulement par la tresseuse.">
                <input id="client-address" v-model="clientAddress" autocomplete="street-address" maxlength="200" placeholder="Ex. 8 rue des Vergers, 2e étage" :class="inputClass" />
              </UiField>
              <p class="text-xs text-ink-soft sm:col-span-2">Votre commune n’apparaît pas ? Elle ne se déplace pas jusque-là, choisissez « chez la tresseuse » ou une autre tresseuse.</p>
            </div>
          </section>

          <!-- Tresseuse (seulement s'il y en a plusieurs) -->
          <section v-if="salon.staff.length > 1" aria-label="Tresseuse">
            <p class="eyebrow text-ink-soft">Avec qui ?</p>
            <div class="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tresseuse">
              <button
                type="button" role="radio" :aria-checked="staffId === null"
                class="flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition"
                :class="staffId === null ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'"
                @click="staffId = null"
              >Sans préférence</button>
              <button
                v-for="st in salon.staff" :key="st.id" type="button" role="radio" :aria-checked="staffId === st.id"
                class="flex h-12 items-center gap-2 rounded-full border py-1 pl-1 pr-5 text-sm font-semibold transition"
                :class="staffId === st.id ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'"
                @click="staffId = st.id"
              >
                <img v-if="st.photoUrl" :src="st.photoUrl" alt="" class="size-10 rounded-full object-cover" />
                <span v-else class="grid size-10 place-items-center rounded-full bg-sand font-display text-base text-ink">{{ initials(st.name) }}</span>
                {{ st.name }}
              </button>
            </div>
          </section>

          <!-- 03 Jour et heure -->
          <section aria-labelledby="s3">
            <StepHead id="s3" n="03" title="Jour et heure" :done="!!slot" :summary="slot ? `${formatDayLong(slot)} à ${formatTime(slot)}` : undefined" />
            <p v-if="!chosen.length" class="mt-5 text-ink-soft">Choisissez d’abord une coiffure pour voir les disponibilités.</p>
            <template v-else>
              <div class="-mx-4 mt-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0" data-lenis-prevent>
                <div class="flex w-max gap-2" role="radiogroup" aria-label="Jour">
                  <button
                    v-for="d in days" :key="d" type="button" role="radio" :aria-checked="day === d"
                    :disabled="avail[d] !== undefined && !slotsOf(d).length"
                    class="flex w-16 flex-col items-center rounded-2xl border py-3 transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sand/40 disabled:text-ink-soft/35"
                    :class="day === d ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'"
                    @click="day = d"
                  >
                    <span class="text-[11px] font-semibold uppercase tracking-widest">{{ dayParts(d).wd }}</span>
                    <span class="font-display text-3xl leading-none">{{ dayParts(d).n }}</span>
                    <span class="text-[11px]">{{ dayParts(d).m }}</span>
                  </button>
                </div>
              </div>
              <p v-if="slotTaken" class="mt-4 rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta" role="alert">Ce créneau vient d’être réservé par quelqu’un d’autre. Voici les horaires encore libres.</p>
              <div class="mt-6" aria-live="polite">
                <div v-if="availLoading && !slotsOf(day).length" class="flex items-center gap-3 text-sm text-ink-soft"><UiSpinner /> Recherche des créneaux libres...</div>
                <p v-else-if="day && avail[day] === 'error'" class="text-sm text-terracotta">Les créneaux de ce jour n’ont pas pu être chargés. <button type="button" class="underline" @click="loadAvailability">Réessayer</button></p>
                <p v-else-if="!day || !periods.length" class="text-ink-soft">Aucun créneau libre sur cette période. Essayez un autre jour ou moins de coiffures.</p>
                <div v-else class="space-y-6">
                  <div v-for="p in periods" :key="p.label">
                    <p class="eyebrow mb-3 text-ink-soft">{{ p.label }}</p>
                    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" :aria-label="p.label">
                      <button
                        v-for="s in p.items" :key="s.startsAt" type="button" role="radio" :aria-checked="slot === s.startsAt"
                        class="h-11 rounded-full border text-sm font-semibold tabular-nums transition"
                        :class="slot === s.startsAt ? 'border-terracotta bg-terracotta text-cream' : 'border-line hover:border-ink'"
                        @click="slot = s.startsAt"
                      >{{ formatTime(s.startsAt) }}</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </section>
        </div>

        <!-- 04 Récapitulatif -->
        <aside class="lg:sticky lg:top-28 lg:self-start" aria-labelledby="s4">
          <div class="rounded-[var(--radius-card)] bg-sand/70 p-6">
            <StepHead id="s4" n="04" title="Récapitulatif" :done="canConfirm" />
            <dl class="mt-5 divide-y divide-line text-sm">
              <div class="flex justify-between gap-4 py-2.5"><dt class="text-ink-soft">Tresseuse</dt><dd class="text-right font-semibold">{{ salon.name }}</dd></div>
              <div class="flex justify-between gap-4 py-2.5"><dt class="text-ink-soft">Lieu</dt><dd class="text-right">{{ placeSummary }}</dd></div>
              <div class="flex justify-between gap-4 py-2.5"><dt class="text-ink-soft">Date</dt><dd class="text-right first-letter:uppercase">{{ slot ? formatDayLong(slot) : day ? formatDayLong(dayToIso(day)) : 'À choisir' }}</dd></div>
              <div class="flex justify-between gap-4 py-2.5"><dt class="text-ink-soft">Heure</dt><dd>{{ slot ? formatTime(slot) : 'À choisir' }}</dd></div>
              <div v-if="salon.staff.length > 1" class="flex justify-between gap-4 py-2.5"><dt class="text-ink-soft">Avec</dt><dd>{{ staffName }}</dd></div>
              <div v-for="s in chosen" :key="s.id" class="flex justify-between gap-4 py-2.5"><dt>{{ s.name }}</dt><dd class="shrink-0">{{ formatEuro(s.priceEur) }}</dd></div>
              <div v-if="travelFee" class="flex justify-between gap-4 py-2.5"><dt>Frais de déplacement</dt><dd class="shrink-0">{{ formatEuro(travelFee) }}</dd></div>
              <div class="flex items-baseline justify-between gap-4 pt-4"><dt class="font-semibold">Total</dt><dd class="font-display text-3xl">{{ formatEuro(total) }}</dd></div>
            </dl>
            <p class="mt-1 text-xs text-ink-soft">Réglé sur place, le jour du rendez-vous.</p>
            <div class="mt-5">
              <UiField label="Un mot pour la tresseuse (facultatif)" for="booking-note">
                <textarea id="booking-note" v-model="note" maxlength="500" placeholder="Longueur souhaitée, mèches apportées..." :class="[textareaClass, 'min-h-20']" />
              </UiField>
            </div>

            <div v-if="needAuth && !auth.user" class="mt-6 rounded-2xl border border-line bg-cream p-5">
              <p class="font-display text-2xl">Dernière étape</p>
              <p class="mt-1 text-sm text-ink-soft">Connectez-vous pour confirmer. Votre sélection est conservée.</p>
              <div class="mt-4 grid grid-cols-2 rounded-full border border-line p-1 text-sm font-semibold" role="tablist">
                <button type="button" role="tab" :aria-selected="authMode === 'login'" class="h-10 rounded-full" :class="authMode === 'login' ? 'bg-ink text-cream' : ''" @click="authMode = 'login'">Connexion</button>
                <button type="button" role="tab" :aria-selected="authMode === 'register'" class="h-10 rounded-full" :class="authMode === 'register' ? 'bg-ink text-cream' : ''" @click="authMode = 'register'">Inscription</button>
              </div>
              <div class="mt-5"><AuthForm :mode="authMode" compact @done="onAuthed" /></div>
            </div>
            <template v-else>
              <p v-if="submitError" class="mt-5 text-sm text-terracotta" role="alert">{{ submitError }}</p>
              <p v-if="slotTaken" class="mt-5 text-sm text-terracotta" role="alert">Créneau déjà pris, choisissez un autre horaire.</p>
              <UiButton class="mt-6" variant="terracotta" size="lg" block :disabled="!canConfirm" :loading="submitting" @click="confirm">
                Confirmer le rendez-vous
              </UiButton>
              <p v-if="!canConfirm" class="mt-3 text-center text-xs text-ink-soft">{{ !chosen.length ? 'Choisissez une coiffure.' : !placeOk ? 'Indiquez votre commune et votre adresse.' : 'Choisissez un créneau.' }}</p>
            </template>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
