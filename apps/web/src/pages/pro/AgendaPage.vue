<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { formatEuro, formatTime, toLocalDate, type BookingDto, type BookingStatus, type StaffDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import BookingPanel from '@/components/pro/BookingPanel.vue'
import StatusBadge from '@/components/pro/StatusBadge.vue'
import { addDays, dayStart, errMsg, formatDayShort, localMinutes, today, weekStart } from '@/components/pro/time'

const START_H = 7
const END_H = 21
const SLOT_PX = 44 // hauteur d'un creneau de 30 min
const PX_PER_MIN = SLOT_PX / 30

const view = ref<'day' | 'week'>('day')
const date = ref(today())
const staff = ref<StaffDto[]>([])
const bookings = ref<BookingDto[]>([])
const loading = ref(true)
const error = ref('')
const selected = ref<BookingDto | null>(null)

const range = computed(() => {
  const from = view.value === 'day' ? date.value : weekStart(date.value)
  const to = addDays(from, view.value === 'day' ? 1 : 7)
  return { from, to }
})

async function load() {
  loading.value = true; error.value = ''
  try {
    const [s, b] = await Promise.all([
      staff.value.length ? Promise.resolve(staff.value) : proApi.getStaff(),
      proApi.bookings({ from: dayStart(range.value.from), to: dayStart(range.value.to) }),
    ])
    staff.value = s
    bookings.value = b.sort((a, z) => a.startsAt.localeCompare(z.startsAt))
  } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
}
onMounted(load)
watch(range, load)

function shift(n: number) { date.value = addDays(date.value, view.value === 'day' ? n : n * 7) }

const columns = computed(() => {
  const ids = new Set(bookings.value.map((b) => b.staff.id))
  const cols = staff.value.filter((s) => s.active || ids.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
  for (const b of bookings.value) if (!cols.some((c) => c.id === b.staff.id)) cols.push({ id: b.staff.id, name: b.staff.name })
  return cols
})
const slots = computed(() => Array.from({ length: (END_H - START_H) * 2 }, (_, i) => START_H * 60 + i * 30))
const label = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const tone: Record<BookingStatus, string> = {
  confirmed: 'bg-copper/15 border-copper text-ink',
  completed: 'bg-sage/15 border-sage text-ink',
  no_show: 'bg-terracotta/10 border-terracotta text-terracotta-deep',
  cancelled_by_client: 'bg-terracotta/5 border-terracotta/60 text-ink-soft line-through',
  cancelled_by_salon: 'bg-terracotta/5 border-terracotta/60 text-ink-soft line-through',
}
function blockStyle(b: BookingDto) {
  const start = Math.max(localMinutes(b.startsAt), START_H * 60)
  const end = Math.min(localMinutes(b.endsAt) || 24 * 60, END_H * 60)
  return { top: `${(start - START_H * 60) * PX_PER_MIN}px`, height: `${Math.max(end - start, 20) * PX_PER_MIN - 2}px` }
}
const byStaff = (id: number) => bookings.value.filter((b) => b.staff.id === id)

const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => {
  const d = addDays(range.value.from, i)
  return { date: d, items: bookings.value.filter((b) => toLocalDate(b.startsAt) === d) }
}))

const nowLine = computed(() => {
  if (date.value !== today()) return null
  const m = localMinutes(new Date().toISOString())
  if (m < START_H * 60 || m > END_H * 60) return null
  return `${(m - START_H * 60) * PX_PER_MIN}px`
})
const title = computed(() => view.value === 'day' ? formatDayShort(date.value) : `Semaine du ${formatDayShort(range.value.from)}`)

function onUpdated(b: BookingDto) {
  bookings.value = bookings.value.map((x) => (x.id === b.id ? b : x))
  selected.value = b
}
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-2">
      <button type="button" class="grid size-9 place-items-center rounded-full border border-line hover:bg-sand/60" aria-label="Précédent" @click="shift(-1)"><ChevronLeft class="size-4" /></button>
      <button type="button" class="h-9 rounded-full border border-line px-4 text-[13px] font-semibold hover:bg-sand/60" @click="date = today()">Aujourd'hui</button>
      <button type="button" class="grid size-9 place-items-center rounded-full border border-line hover:bg-sand/60" aria-label="Suivant" @click="shift(1)"><ChevronRight class="size-4" /></button>
      <h2 class="ml-2 font-display text-2xl capitalize">{{ title }}</h2>
    </div>
    <div class="flex items-center gap-3">
      <input :value="date" type="date" @change="date = ($event.target as HTMLInputElement).value || today()" class="h-9 rounded-full border border-line bg-white/70 px-3 text-[13px]" aria-label="Choisir une date" />
      <div class="inline-flex rounded-full border border-line p-0.5" role="tablist">
        <button v-for="v in (['day', 'week'] as const)" :key="v" type="button" role="tab" :aria-selected="view === v" class="h-8 rounded-full px-4 text-[13px] font-semibold" :class="view === v ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'" @click="view = v">{{ v === 'day' ? 'Jour' : 'Semaine' }}</button>
      </div>
    </div>
  </div>

  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading && !bookings.length && !staff.length" />

  <!-- Vue jour -->
  <div v-else-if="view === 'day'" class="overflow-x-auto rounded-2xl border border-line bg-white/40" :class="loading && 'opacity-60'">
    <p v-if="!columns.length" class="p-10 text-center text-ink-soft">Ajoutez une personne dans « Planning » pour afficher l'agenda.</p>
    <div v-else class="grid min-w-max" :style="{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(180px, 1fr))` }">
      <div class="sticky left-0 z-10 border-b border-line bg-cream" />
      <div v-for="c in columns" :key="c.id" class="border-b border-l border-line bg-cream px-3 py-3 text-[14px] font-semibold">{{ c.name }}</div>
      <div class="sticky left-0 z-10 bg-cream">
        <div v-for="s in slots" :key="s" class="relative border-b border-line/60 pr-2 text-right text-[11px] text-ink-soft" :style="{ height: `${SLOT_PX}px` }">
          <span v-if="s % 60 === 0" class="relative -top-2">{{ label(s) }}</span>
        </div>
      </div>
      <div v-for="c in columns" :key="c.id" class="relative border-l border-line">
        <div v-for="s in slots" :key="s" class="border-b" :class="s % 60 === 0 ? 'border-line/40' : 'border-line/70 border-dashed'" :style="{ height: `${SLOT_PX}px` }" />
        <div v-if="nowLine" class="pointer-events-none absolute inset-x-0 z-10 h-px bg-terracotta" :style="{ top: nowLine }" />
        <button
          v-for="b in byStaff(c.id)" :key="b.id" type="button"
          class="absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left text-[12px] leading-snug shadow-sm transition hover:shadow-md"
          :class="tone[b.status]" :style="blockStyle(b)" @click="selected = b"
        >
          <span class="block font-semibold">{{ formatTime(b.startsAt) }} {{ b.client.fullName }}</span>
          <span class="block truncate opacity-80">{{ b.items.map((i) => i.name).join(', ') }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Vue semaine -->
  <div v-else class="divide-y divide-line border-y border-line" :class="loading && 'opacity-60'">
    <section v-for="d in weekDays" :key="d.date" class="grid gap-3 py-4 md:grid-cols-[200px_1fr]">
      <h3 class="font-display text-xl capitalize" :class="d.date === today() && 'text-copper'">{{ formatDayShort(d.date) }}</h3>
      <p v-if="!d.items.length" class="text-[14px] text-ink-soft/70">Aucun rendez-vous</p>
      <ul v-else class="space-y-1.5">
        <li v-for="b in d.items" :key="b.id">
          <button type="button" class="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-sand/40" @click="selected = b">
            <span class="w-24 font-semibold">{{ formatTime(b.startsAt) }} à {{ formatTime(b.endsAt) }}</span>
            <span class="min-w-40 flex-1 font-medium">{{ b.client.fullName }} <span class="font-normal text-ink-soft">· {{ b.items.map((i) => i.name).join(', ') }}</span></span>
            <span class="text-ink-soft">{{ b.staff.name }}</span>
            <span class="w-28 text-right">{{ formatEuro(b.totalPriceEur) }}</span>
            <StatusBadge :status="b.status" />
          </button>
        </li>
      </ul>
    </section>
  </div>

  <div class="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-soft">
    <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-copper" /> Confirmé</span>
    <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-sage" /> Honoré</span>
    <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-terracotta" /> Absent ou annulé</span>
  </div>

  <BookingPanel :booking="selected" @close="selected = null" @updated="onUpdated" />
</template>
