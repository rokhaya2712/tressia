<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Phone } from '@lucide/vue'
import { formatDayLong, formatEuro, formatTime, type BookingDto, type ProStatsDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import UiButton from '@/components/ui/UiButton.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import BookingPanel from '@/components/pro/BookingPanel.vue'
import StatusBadge from '@/components/pro/StatusBadge.vue'
import { errMsg } from '@/components/pro/time'

const stats = ref<ProStatsDto | null>(null)
const error = ref('')
const selected = ref<BookingDto | null>(null)

async function load() {
  try { stats.value = await proApi.stats() } catch (e) { error.value = errMsg(e) }
}
onMounted(load)

function onUpdated(b: BookingDto) {
  if (!stats.value) return
  const patch = (list: BookingDto[]) => list.map((x) => (x.id === b.id ? b : x))
  stats.value = { ...stats.value, today: patch(stats.value.today), upcoming: patch(stats.value.upcoming) }
  selected.value = b
}
const services = (b: BookingDto) => b.items.map((i) => i.name).join(', ')
</script>

<template>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="!stats" />
  <div v-else class="space-y-10">
    <section class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
      <div class="bg-cream p-6">
        <p class="eyebrow text-ink-soft">Aujourd'hui</p>
        <p class="mt-2 font-display text-5xl text-ink">{{ stats.todayCount }}</p>
        <p class="text-[13px] text-ink-soft">rendez-vous</p>
      </div>
      <div class="bg-cream p-6">
        <p class="eyebrow text-ink-soft">Cette semaine</p>
        <p class="mt-2 font-display text-5xl text-ink">{{ stats.weekCount }}</p>
        <p class="text-[13px] text-ink-soft">rendez-vous</p>
      </div>
      <div class="bg-cream p-6">
        <p class="eyebrow text-ink-soft">Chiffre d'affaires estimé</p>
        <p class="mt-2 font-display text-4xl text-copper sm:text-5xl">{{ formatEuro(stats.weekRevenueEur) }}</p>
        <p class="text-[13px] text-ink-soft">cette semaine</p>
      </div>
    </section>

    <div class="grid gap-10 xl:grid-cols-[1.6fr_1fr]">
      <section>
        <div class="mb-4 flex items-end justify-between">
          <div>
            <p class="eyebrow text-copper">Aujourd'hui</p>
            <h2 class="font-display text-3xl capitalize">{{ formatDayLong(new Date()) }}</h2>
          </div>
          <UiButton :to="{ name: 'pro-agenda' }" variant="outline" size="sm">Ouvrir l'agenda</UiButton>
        </div>
        <p v-if="!stats.today.length" class="border-y border-line py-10 text-center text-ink-soft">Aucun rendez-vous aujourd'hui.</p>
        <ul v-else class="divide-y divide-line border-y border-line">
          <li v-for="b in stats.today" :key="b.id" class="grid gap-3 py-4 sm:grid-cols-[80px_1fr_auto] sm:items-center">
            <div>
              <p class="font-display text-2xl leading-none">{{ formatTime(b.startsAt) }}</p>
              <p class="text-[12px] text-ink-soft">à {{ formatTime(b.endsAt) }}</p>
            </div>
            <div class="min-w-0">
              <p class="font-semibold">{{ b.client.fullName }} <StatusBadge :status="b.status" class="ml-2 align-middle" /></p>
              <p class="truncate text-[14px] text-ink-soft">{{ services(b) }} · avec {{ b.staff.name }}</p>
              <a v-if="b.client.phone" :href="`tel:${b.client.phone}`" class="mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium text-copper hover:underline"><Phone class="size-3.5" />{{ b.client.phone }}</a>
            </div>
            <UiButton size="sm" variant="ghost" class="border border-line" @click="selected = b">Gérer</UiButton>
          </li>
        </ul>
      </section>

      <section>
        <p class="eyebrow text-copper">À venir</p>
        <h2 class="mb-4 font-display text-3xl">Prochains rendez-vous</h2>
        <p v-if="!stats.upcoming.length" class="border-y border-line py-10 text-center text-ink-soft">Rien de prévu pour l'instant.</p>
        <ul v-else class="divide-y divide-line border-y border-line">
          <li v-for="b in stats.upcoming.slice(0, 5)" :key="b.id">
            <button type="button" class="flex w-full items-center justify-between gap-3 py-3.5 text-left hover:bg-sand/30" @click="selected = b">
              <span class="min-w-0">
                <span class="block text-[13px] capitalize text-ink-soft">{{ formatDayLong(b.startsAt) }} · {{ formatTime(b.startsAt) }}</span>
                <span class="block truncate font-semibold">{{ b.client.fullName }}</span>
                <span class="block truncate text-[13px] text-ink-soft">{{ services(b) }}</span>
              </span>
              <span class="shrink-0 text-[14px] font-medium">{{ formatEuro(b.totalPriceEur) }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
  <BookingPanel :booking="selected" @close="selected = null" @updated="onUpdated" />
</template>
