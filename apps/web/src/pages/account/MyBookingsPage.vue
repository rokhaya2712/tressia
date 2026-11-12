<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { BookingDto } from '@tressia/shared'
import { bookingsApi } from '@/api/bookings'
import UiButton from '@/components/ui/UiButton.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import BookingCard from '@/components/public/account/BookingCard.vue'

const tab = ref<'upcoming' | 'past'>('upcoming')
const data = ref<{ upcoming: BookingDto[]; past: BookingDto[] } | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  error.value = ''
  try { data.value = await bookingsApi.mine() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Une erreur est survenue' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="grain min-h-screen bg-cream pb-24 pt-24 md:pt-28">
    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <p class="eyebrow text-copper">Mon carnet</p>
      <h1 class="mt-3 font-display text-5xl leading-[0.95] sm:text-7xl">Mes rendez-vous</h1>

      <div class="mt-8 flex gap-8 border-b border-line" role="tablist" aria-label="Rendez-vous">
        <button
          v-for="t in [{ k: 'upcoming', l: 'À venir' }, { k: 'past', l: 'Passés' }] as const" :key="t.k"
          type="button" role="tab" :aria-selected="tab === t.k"
          class="-mb-px flex min-h-12 items-center gap-2 border-b-2 text-sm font-semibold transition"
          :class="tab === t.k ? 'border-terracotta text-ink' : 'border-transparent text-ink-soft hover:text-ink'"
          @click="tab = t.k"
        >
          {{ t.l }}
          <span v-if="data" class="text-ink-soft/60">{{ data[t.k].length }}</span>
        </button>
      </div>

      <div v-if="loading" class="grid min-h-60 place-items-center"><UiSpinner /></div>
      <div v-else-if="error" class="py-16 text-center">
        <p class="font-display text-3xl">Vos rendez-vous n’ont pas pu être chargés.</p>
        <p class="mt-2 text-ink-soft">{{ error }}</p>
        <UiButton class="mt-6" variant="outline" @click="load">Réessayer</UiButton>
      </div>
      <template v-else-if="data">
        <div v-if="!data[tab].length" class="py-20 text-center">
          <p class="font-display text-4xl">{{ tab === 'upcoming' ? 'Aucun rendez-vous prévu.' : 'Pas encore d’historique.' }}</p>
          <p class="mt-3 text-ink-soft">{{ tab === 'upcoming' ? 'Trouvez une tresseuse près de chez vous et choisissez votre créneau en quelques secondes.' : 'Vos rendez-vous passés apparaîtront ici, avec la possibilité de laisser un avis.' }}</p>
          <UiButton v-if="tab === 'upcoming'" class="mt-8" variant="ink" :to="{ name: 'search' }">Trouver une tresseuse</UiButton>
        </div>
        <div v-else role="tabpanel">
          <BookingCard v-for="b in data[tab]" :key="b.id" :booking="b" @changed="load" />
        </div>
      </template>
    </div>
  </div>
</template>
