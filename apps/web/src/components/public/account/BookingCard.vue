<script setup lang="ts">
import { computed, ref } from 'vue'
import { BOOKING_STATUS_LABELS, formatDayLong, formatEuro, formatTime, type BookingDto } from '@tressia/shared'
import { Car, Home, Star } from '@lucide/vue'
import { bookingsApi } from '@/api/bookings'
import { textareaClass } from '@/components/ui/fields'
import UiButton from '@/components/ui/UiButton.vue'
import { mapsLink } from '@/composables/format'

const props = defineProps<{ booking: BookingDto }>()
const emit = defineEmits<{ changed: [] }>()

const b = computed(() => props.booking)
const confirmCancel = ref(false)
const reviewing = ref(false)
const rating = ref(0)
const hover = ref(0)
const comment = ref('')
const busy = ref(false)
const err = ref('')
const reviewed = ref(false)
const uid = `b${props.booking.id}`
const atHome = computed(() => b.value.location === 'domicile')
const herAddress = computed(() => `${b.value.salon.address}, ${b.value.salon.city}`)

const statusClass = computed(() => ({
  confirmed: 'bg-sage text-cream',
  completed: 'bg-ink text-cream',
  no_show: 'bg-sand text-ink-soft',
  cancelled_by_client: 'bg-sand text-ink-soft',
  cancelled_by_salon: 'bg-terracotta/10 text-terracotta',
}[b.value.status]))

async function cancel() {
  busy.value = true; err.value = ''
  try { await bookingsApi.cancel(b.value.id); confirmCancel.value = false; emit('changed') }
  catch (e) { err.value = e instanceof Error ? e.message : 'Annulation impossible.' }
  finally { busy.value = false }
}
async function sendReview() {
  if (!rating.value) { err.value = 'Choisissez une note de 1 à 5.'; return }
  busy.value = true; err.value = ''
  try { await bookingsApi.review(b.value.id, rating.value, comment.value.trim() || undefined); reviewed.value = true; reviewing.value = false; emit('changed') }
  catch (e) { err.value = e instanceof Error ? e.message : 'Envoi impossible.' }
  finally { busy.value = false }
}
</script>

<template>
  <article class="grid gap-5 border-b border-line py-8 sm:grid-cols-[150px_1fr] sm:gap-8">
    <div class="flex items-baseline gap-3 sm:block">
      <p class="font-display text-5xl leading-none tabular-nums">{{ formatTime(b.startsAt) }}</p>
      <p class="mt-2 text-sm font-semibold first-letter:uppercase text-ink-soft">{{ formatDayLong(b.startsAt) }}</p>
    </div>
    <div class="min-w-0">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <RouterLink :to="{ name: 'salon', params: { slug: b.salon.slug } }" class="font-display text-3xl leading-tight hover:text-terracotta">{{ b.salon.name }}</RouterLink>
          <p class="text-sm text-ink-soft">{{ b.salon.neighborhood }}, {{ b.salon.city }} <span class="text-line">/</span> avec {{ b.staff.name }}</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusClass">{{ BOOKING_STATUS_LABELS[b.status] }}</span>
      </div>
      <p v-if="atHome" class="mt-3 flex items-start gap-2 text-sm"><Car class="mt-0.5 size-4 shrink-0 text-copper" aria-hidden="true" />À domicile : {{ b.clientAddress }}, {{ b.clientCity }}</p>
      <p v-else class="mt-3 flex items-start gap-2 text-sm"><Home class="mt-0.5 size-4 shrink-0 text-copper" aria-hidden="true" /><span>Chez la tresseuse : {{ herAddress }}
        <a v-if="b.status === 'confirmed'" :href="mapsLink(null, null, herAddress)" target="_blank" rel="noopener" class="ml-1 font-semibold text-terracotta underline underline-offset-4">Itinéraire</a></span></p>
      <ul class="mt-4 space-y-1 text-sm">
        <li v-for="it in b.items" :key="it.serviceId" class="flex justify-between gap-4"><span>{{ it.name }}</span><span class="text-ink-soft">{{ formatEuro(it.priceEur) }}</span></li>
      </ul>
      <p v-if="b.travelFeeEur" class="mt-1 flex justify-between gap-4 text-sm"><span>Frais de déplacement</span><span class="text-ink-soft">{{ formatEuro(b.travelFeeEur) }}</span></p>
      <p class="mt-3 flex justify-between border-t border-line pt-3 text-sm"><span class="font-semibold">Total</span><strong>{{ formatEuro(b.totalPriceEur) }}</strong></p>
      <p v-if="b.cancelReason" class="mt-3 text-sm italic text-ink-soft">Motif : {{ b.cancelReason }}</p>

      <!-- Annulation -->
      <div v-if="b.status === 'confirmed'" class="mt-5">
        <div v-if="confirmCancel" class="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4" role="alertdialog" :aria-labelledby="`${uid}-c`">
          <p :id="`${uid}-c`" class="text-sm font-semibold">Annuler ce rendez-vous ? Le créneau sera libéré.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton size="sm" variant="terracotta" :loading="busy" @click="cancel">Oui, annuler</UiButton>
            <UiButton size="sm" variant="ghost" @click="confirmCancel = false">Garder</UiButton>
          </div>
        </div>
        <template v-else>
          <UiButton size="sm" variant="outline" :disabled="!b.canCancel" @click="confirmCancel = true">Annuler le rendez-vous</UiButton>
          <p v-if="!b.canCancel" class="mt-2 text-xs text-ink-soft">Annulation possible jusqu’à 2 h avant. Contactez la tresseuse directement.</p>
        </template>
      </div>

      <!-- Avis -->
      <div v-if="b.canReview && !reviewed" class="mt-5">
        <UiButton v-if="!reviewing" size="sm" variant="copper" @click="reviewing = true">Laisser un avis</UiButton>
        <form v-else class="rounded-2xl bg-sand/60 p-4" @submit.prevent="sendReview">
          <fieldset>
            <legend class="text-sm font-semibold">Votre note</legend>
            <div class="mt-2 flex gap-1" @mouseleave="hover = 0">
              <label v-for="i in 5" :key="i" class="grid size-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-copper">
                <input v-model="rating" type="radio" :name="`${uid}-r`" :value="i" class="sr-only" :aria-label="`${i} sur 5`" />
                <Star class="size-7 transition" :class="i <= (hover || rating) ? 'fill-copper text-copper' : 'text-ink-soft/40'" aria-hidden="true" @mouseenter="hover = i" />
              </label>
            </div>
          </fieldset>
          <label class="mt-3 block">
            <span class="mb-1.5 block text-[13px] font-semibold text-ink-soft">Commentaire (facultatif)</span>
            <textarea v-model="comment" maxlength="1000" :class="[textareaClass, 'min-h-20']" placeholder="L’accueil, le résultat, la ponctualité..." />
          </label>
          <div class="mt-3 flex gap-2">
            <UiButton type="submit" size="sm" variant="ink" :loading="busy">Publier l’avis</UiButton>
            <UiButton size="sm" variant="ghost" @click="reviewing = false">Plus tard</UiButton>
          </div>
        </form>
      </div>
      <p v-if="reviewed" class="mt-5 text-sm font-semibold text-sage">Merci, votre avis est publié.</p>
      <p v-if="err" class="mt-3 text-sm text-terracotta" role="alert">{{ err }}</p>
    </div>
  </article>
</template>
