<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { WEEKDAYS, type DayHours } from './salonForm'

const days = defineModel<DayHours[]>({ required: true })
const timeInput = 'h-9 w-[104px] rounded-lg border border-line bg-white/70 px-2 text-[14px] outline-none focus:border-copper'

function addRange(d: DayHours) {
  const last = d.ranges[d.ranges.length - 1]
  d.ranges.push(last ? { opensAt: last.closesAt < '20:00' ? last.closesAt : '14:00', closesAt: '19:00' } : { opensAt: '08:00', closesAt: '19:00' })
}
function toggle(d: DayHours, open: boolean) { d.ranges = open ? [{ opensAt: '08:00', closesAt: '19:00' }] : [] }
</script>

<template>
  <ul class="divide-y divide-line border-y border-line">
    <li v-for="d in days" :key="d.weekday" class="grid gap-3 py-3.5 sm:grid-cols-[140px_1fr] sm:items-start">
      <label class="flex items-center gap-2.5 pt-1.5 text-[15px] font-semibold">
        <input type="checkbox" class="size-4 accent-copper" :checked="d.ranges.length > 0" @change="toggle(d, ($event.target as HTMLInputElement).checked)" />
        {{ WEEKDAYS[d.weekday] }}
      </label>
      <p v-if="!d.ranges.length" class="pt-1.5 text-[14px] text-ink-soft">Fermé</p>
      <div v-else class="space-y-2">
        <div v-for="(r, i) in d.ranges" :key="i" class="flex flex-wrap items-center gap-2">
          <input v-model="r.opensAt" type="time" step="900" :class="timeInput" :aria-label="`${WEEKDAYS[d.weekday]} ouverture`" />
          <span class="text-ink-soft">à</span>
          <input v-model="r.closesAt" type="time" step="900" :class="timeInput" :aria-label="`${WEEKDAYS[d.weekday]} fermeture`" />
          <button v-if="d.ranges.length > 1" type="button" class="rounded-full p-1.5 text-ink-soft hover:bg-ink/5" aria-label="Retirer la plage" @click="d.ranges.splice(i, 1)"><X class="size-4" /></button>
          <button v-if="i === d.ranges.length - 1" type="button" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold text-copper hover:bg-copper/10" @click="addRange(d)"><Plus class="size-3.5" /> Ajouter une pause</button>
        </div>
      </div>
    </li>
  </ul>
</template>
