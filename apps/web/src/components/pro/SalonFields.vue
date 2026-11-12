<script setup lang="ts">
import { computed, watch } from 'vue'
import { AUDIENCES, AUDIENCE_LABELS, CITIES, SERVICE_MODES, SERVICE_MODE_LABELS, TRAVEL_AREAS, acceptsHome } from '@tressia/shared'
import UiField from '@/components/ui/UiField.vue'
import { inputClass, textareaClass } from '@/components/ui/fields'
import LocationPicker from './LocationPicker.vue'
import type { SalonForm } from './salonForm'

const form = defineModel<SalonForm>({ required: true })
const props = withDefaults(defineProps<{ part?: 'info' | 'address' | 'all'; errors?: Record<string, string> }>(), { part: 'all', errors: () => ({}) })
const showInfo = computed(() => props.part !== 'address')
const showAddress = computed(() => props.part !== 'info')
const neighborhoods = computed(() => CITIES[form.value.city] ?? [])
watch(() => form.value.city, () => { if (!neighborhoods.value.includes(form.value.neighborhood)) form.value.neighborhood = '' })
const travels = computed(() => acceptsHome(form.value.serviceMode))
function toggleCommune(c: string) {
  const z = form.value.travelZone
  form.value.travelZone = z.includes(c) ? z.filter((x) => x !== c) : [...z, c]
}
function toggleArea(communes: string[]) {
  const all = communes.every((c) => form.value.travelZone.includes(c))
  form.value.travelZone = all ? form.value.travelZone.filter((c) => !communes.includes(c)) : [...new Set([...form.value.travelZone, ...communes])]
}
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <template v-if="showInfo">
      <UiField label="Nom affiché" :error="errors.name" class="sm:col-span-2">
        <input v-model="form.name" :class="inputClass" placeholder="Ex. Awa Tresses" required />
      </UiField>
      <UiField label="Description" hint="Vos spécialités, votre expérience, ce qui vous distingue." class="sm:col-span-2" :error="errors.description">
        <textarea v-model="form.description" :class="textareaClass" />
      </UiField>
      <fieldset class="sm:col-span-2">
        <legend class="mb-1.5 text-[13px] font-semibold text-ink-soft">Public</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="a in AUDIENCES" :key="a" class="cursor-pointer rounded-full border px-4 py-2 text-[14px] transition" :class="form.audience === a ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink/50'">
            <input v-model="form.audience" type="radio" :value="a" class="sr-only" />{{ AUDIENCE_LABELS[a] }}
          </label>
        </div>
      </fieldset>
      <UiField label="Téléphone" :error="errors.phone"><input v-model="form.phone" type="tel" :class="inputClass" placeholder="06 12 34 56 78" /></UiField>
      <UiField label="WhatsApp" :error="errors.whatsapp"><input v-model="form.whatsapp" type="tel" :class="inputClass" placeholder="06 12 34 56 78" /></UiField>
    </template>
    <template v-if="showAddress">
      <fieldset class="sm:col-span-2">
        <legend class="mb-1.5 text-[13px] font-semibold text-ink-soft">Où tressez-vous ?</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="m in SERVICE_MODES" :key="m" class="cursor-pointer rounded-full border px-4 py-2 text-[14px] transition" :class="form.serviceMode === m ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink/50'">
            <input v-model="form.serviceMode" type="radio" :value="m" class="sr-only" />{{ SERVICE_MODE_LABELS[m] }}
          </label>
        </div>
      </fieldset>
      <UiField label="Votre adresse" :error="errors.address" hint="Jamais affichée publiquement : seule la cliente qui réserve chez vous la reçoit." class="sm:col-span-2">
        <input v-model="form.address" :class="inputClass" placeholder="Ex. 14 rue du Sauvage" />
      </UiField>
      <UiField label="Ville" :error="errors.city">
        <select v-model="form.city" :class="inputClass"><option v-for="c in Object.keys(CITIES)" :key="c" :value="c">{{ c }}</option></select>
      </UiField>
      <UiField label="Quartier" :error="errors.neighborhood">
        <select v-model="form.neighborhood" :class="inputClass">
          <option value="" disabled>Choisir un quartier</option>
          <option v-for="n in neighborhoods" :key="n" :value="n">{{ n }}</option>
        </select>
      </UiField>
      <template v-if="travels">
        <UiField label="Frais de déplacement (€)" :error="errors.travelFeeEur" hint="Ajoutés au total des rendez-vous à domicile. 0 si offerts.">
          <input v-model.number="form.travelFeeEur" type="number" min="0" max="50" step="1" :class="inputClass" />
        </UiField>
        <div class="sm:col-span-2">
          <p class="mb-1.5 text-[13px] font-semibold text-ink-soft">Communes où vous vous déplacez</p>
          <p v-if="errors.travelZone" class="mb-2 text-[13px] text-terracotta">{{ errors.travelZone }}</p>
          <div v-for="(communes, area) in TRAVEL_AREAS" :key="area" class="mb-3">
            <button type="button" class="mb-1.5 text-[13px] font-medium text-ink-soft underline-offset-2 hover:underline" @click="toggleArea(communes)">{{ area }}</button>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="c in communes" :key="c" type="button" class="rounded-full border px-3 py-1 text-[13px] transition" :class="form.travelZone.includes(c) ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink/50'" :aria-pressed="form.travelZone.includes(c)" @click="toggleCommune(c)">{{ c }}</button>
            </div>
          </div>
        </div>
      </template>
      <div class="sm:col-span-2">
        <p class="mb-1.5 text-[13px] font-semibold text-ink-soft">Position approximative sur la carte</p>
        <LocationPicker v-model:lat="form.lat" v-model:lng="form.lng" />
      </div>
    </template>
  </div>
</template>
