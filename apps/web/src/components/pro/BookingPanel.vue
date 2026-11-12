<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Phone } from '@lucide/vue'
import { formatDayLong, formatDuration, formatEuro, formatTime, type BookingDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import { textareaClass } from '@/components/ui/fields'
import UiButton from '@/components/ui/UiButton.vue'
import SidePanel from './SidePanel.vue'
import StatusBadge from './StatusBadge.vue'
import { errMsg, isPast } from './time'
import { mapsLink } from '@/composables/format'

const props = defineProps<{ booking: BookingDto | null }>()
const emit = defineEmits<{ close: []; updated: [BookingDto] }>()

const cancelling = ref(false)
const reason = ref('')
const busy = ref<'' | 'cancel' | 'complete' | 'noshow'>('')
const error = ref('')
watch(() => props.booking?.id, () => { cancelling.value = false; reason.value = ''; error.value = '' })

const b = computed(() => props.booking)
const started = computed(() => !!b.value && isPast(b.value.startsAt))
const confirmed = computed(() => b.value?.status === 'confirmed')

async function run(kind: 'cancel' | 'complete' | 'noshow') {
  if (!b.value) return
  if (kind === 'cancel' && reason.value.trim().length < 3) { error.value = 'Indiquez un motif (3 caractères minimum).'; return }
  busy.value = kind; error.value = ''
  try {
    const res = kind === 'cancel' ? await proApi.cancelBooking(b.value.id, reason.value.trim())
      : kind === 'complete' ? await proApi.completeBooking(b.value.id)
      : await proApi.noShowBooking(b.value.id)
    emit('updated', res ?? { ...b.value, status: kind === 'cancel' ? 'cancelled_by_salon' : kind === 'complete' ? 'completed' : 'no_show' })
    cancelling.value = false
  } catch (e) { error.value = errMsg(e) } finally { busy.value = '' }
}
</script>

<template>
  <SidePanel :open="!!b" :title="b?.client.fullName ?? ''" eyebrow="Rendez-vous" @close="emit('close')">
    <template v-if="b">
      <div class="flex items-center justify-between">
        <StatusBadge :status="b.status" />
        <span class="text-[13px] text-ink-soft">N° {{ b.id }}</span>
      </div>
      <dl class="mt-5 divide-y divide-line border-y border-line text-[14px]">
        <div class="flex justify-between gap-4 py-3"><dt class="text-ink-soft">Date</dt><dd class="text-right font-medium capitalize">{{ formatDayLong(b.startsAt) }}</dd></div>
        <div class="flex justify-between gap-4 py-3"><dt class="text-ink-soft">Heure</dt><dd class="font-medium">{{ formatTime(b.startsAt) }} à {{ formatTime(b.endsAt) }}</dd></div>
        <div class="flex justify-between gap-4 py-3"><dt class="text-ink-soft">Lieu</dt><dd class="text-right font-medium">{{ b.location === 'domicile' ? 'À domicile' : 'Chez vous' }}</dd></div>
        <div v-if="b.location === 'domicile'" class="flex justify-between gap-4 py-3">
          <dt class="text-ink-soft">Adresse</dt>
          <dd class="text-right"><a :href="mapsLink(null, null, `${b.clientAddress}, ${b.clientCity}`)" target="_blank" rel="noopener" class="font-medium text-copper hover:underline">{{ b.clientAddress }}, {{ b.clientCity }}</a></dd>
        </div>
        <div class="flex justify-between gap-4 py-3">
          <dt class="text-ink-soft">Téléphone</dt>
          <dd><a v-if="b.client.phone" :href="`tel:${b.client.phone}`" class="inline-flex items-center gap-1.5 font-medium text-copper hover:underline"><Phone class="size-3.5" />{{ b.client.phone }}</a><span v-else class="text-ink-soft">Non renseigné</span></dd>
        </div>
        <div class="flex justify-between gap-4 py-3"><dt class="text-ink-soft">E-mail</dt><dd class="truncate font-medium">{{ b.client.email }}</dd></div>
      </dl>
      <p class="eyebrow mt-6 text-ink-soft">Coiffures</p>
      <ul class="mt-2 divide-y divide-line">
        <li v-for="it in b.items" :key="it.serviceId" class="flex justify-between gap-3 py-2.5 text-[14px]">
          <span>{{ it.name }} <span class="text-ink-soft">· {{ formatDuration(it.durationMin) }}</span></span>
          <span class="font-medium">{{ formatEuro(it.priceEur) }}</span>
        </li>
      </ul>
      <div v-if="b.travelFeeEur" class="flex justify-between gap-3 pb-2.5 text-[14px]"><span>Frais de déplacement</span><span class="font-medium">{{ formatEuro(b.travelFeeEur) }}</span></div>
      <div class="flex justify-between border-t border-ink/80 pt-3 font-semibold"><span>Total</span><span>{{ formatEuro(b.totalPriceEur) }}</span></div>
      <div v-if="b.clientNote" class="mt-6 rounded-xl bg-sand/50 p-4 text-[14px]">
        <p class="eyebrow mb-1 text-ink-soft">Note de la cliente</p>{{ b.clientNote }}
      </div>
      <div v-if="b.cancelReason" class="mt-4 rounded-xl bg-terracotta/8 p-4 text-[14px] text-terracotta-deep">
        <p class="eyebrow mb-1">Motif d'annulation</p>{{ b.cancelReason }}
      </div>
      <div v-if="cancelling" class="mt-6">
        <label class="mb-1.5 block text-[13px] font-semibold text-ink-soft" for="cancel-reason">Motif de l'annulation (envoyé à la cliente)</label>
        <textarea id="cancel-reason" v-model="reason" :class="textareaClass" placeholder="Ex. indisponible ce jour-là, merci de reprendre rendez-vous" />
      </div>
      <p v-if="error" class="mt-4 text-[13px] text-terracotta" role="alert">{{ error }}</p>
    </template>
    <template v-if="b && confirmed" #footer>
      <div v-if="cancelling" class="flex gap-2">
        <UiButton variant="ghost" size="sm" @click="cancelling = false">Retour</UiButton>
        <UiButton variant="terracotta" size="sm" class="flex-1" :loading="busy === 'cancel'" @click="run('cancel')">Confirmer l'annulation</UiButton>
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <UiButton v-if="started" variant="ink" size="sm" :loading="busy === 'complete'" @click="run('complete')">Honoré</UiButton>
        <UiButton v-if="started" variant="outline" size="sm" :loading="busy === 'noshow'" @click="run('noshow')">Absente</UiButton>
        <UiButton variant="ghost" size="sm" class="text-terracotta" @click="cancelling = true">Annuler le rendez-vous</UiButton>
      </div>
    </template>
  </SidePanel>
</template>
