<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, Trash } from '@lucide/vue'
import type { ClosureDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { inputClass } from '@/components/ui/fields'
import HoursEditor from '@/components/pro/HoursEditor.vue'
import { flattenHours, groupHours, validateHours, type DayHours } from '@/components/pro/salonForm'
import { errMsg, formatDate, today } from '@/components/pro/time'

const days = ref<DayHours[]>([])
const closures = ref<ClosureDto[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const msg = ref('')
const hoursError = ref('')
const cForm = ref({ startsOn: '', endsOn: '', reason: '' })
const cError = ref('')
const cSaving = ref(false)

onMounted(async () => {
  try {
    const [h, c] = await Promise.all([proApi.getHours(), proApi.getClosures()])
    days.value = groupHours(h)
    closures.value = c.sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
})

async function saveHours() {
  msg.value = ''
  hoursError.value = validateHours(days.value)
  if (hoursError.value) return
  saving.value = true
  try { await proApi.putHours(flattenHours(days.value)); msg.value = 'Horaires enregistrés.' } catch (e) { hoursError.value = errMsg(e) } finally { saving.value = false }
}
async function addClosure() {
  cError.value = ''
  const { startsOn, endsOn, reason } = cForm.value
  if (!startsOn) { cError.value = 'Indiquez au moins la date de début.'; return }
  const end = endsOn || startsOn
  if (end < startsOn) { cError.value = 'La fin doit être après le début.'; return }
  cSaving.value = true
  try {
    closures.value.push(await proApi.addClosure({ startsOn, endsOn: end, reason: reason.trim() || null }))
    closures.value.sort((a, b) => a.startsOn.localeCompare(b.startsOn))
    cForm.value = { startsOn: '', endsOn: '', reason: '' }
  } catch (e) { cError.value = errMsg(e) } finally { cSaving.value = false }
}
async function removeClosure(c: ClosureDto) {
  try { await proApi.deleteClosure(c.id); closures.value = closures.value.filter((x) => x.id !== c.id) } catch (e) { cError.value = errMsg(e) }
}
</script>

<template>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <div v-else class="grid gap-12 xl:grid-cols-[1.4fr_1fr]">
    <section>
      <p class="eyebrow text-copper">Semaine type</p>
      <h2 class="mb-4 font-display text-3xl">Horaires d'ouverture</h2>
      <HoursEditor v-model="days" />
      <p v-if="hoursError" class="mt-3 text-[13px] text-terracotta" role="alert">{{ hoursError }}</p>
      <div class="mt-5 flex items-center gap-4">
        <UiButton :loading="saving" @click="saveHours">Enregistrer les horaires</UiButton>
        <span v-if="msg" class="text-[14px] text-sage">{{ msg }}</span>
      </div>
    </section>
    <section>
      <p class="eyebrow text-copper">Exceptions</p>
      <h2 class="mb-4 font-display text-3xl">Fermetures exceptionnelles</h2>
      <ul v-if="closures.length" class="divide-y divide-line border-y border-line">
        <li v-for="c in closures" :key="c.id" class="flex items-center justify-between gap-3 py-3 text-[14px]">
          <span>
            <span class="font-semibold">{{ c.startsOn === c.endsOn ? formatDate(c.startsOn) : `Du ${formatDate(c.startsOn)} au ${formatDate(c.endsOn)}` }}</span>
            <span v-if="c.reason" class="block text-[13px] text-ink-soft">{{ c.reason }}</span>
          </span>
          <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-terracotta/10 hover:text-terracotta" aria-label="Supprimer la fermeture" @click="removeClosure(c)"><Trash class="size-4" /></button>
        </li>
      </ul>
      <p v-else class="border-y border-line py-6 text-[14px] text-ink-soft">Aucune fermeture prévue.</p>
      <form class="mt-5 grid gap-3 sm:grid-cols-2" novalidate @submit.prevent="addClosure">
        <UiField label="Du"><input v-model="cForm.startsOn" type="date" :min="today()" :class="inputClass" /></UiField>
        <UiField label="Au"><input v-model="cForm.endsOn" type="date" :min="cForm.startsOn || today()" :class="inputClass" /></UiField>
        <UiField label="Motif (facultatif)" class="sm:col-span-2"><input v-model="cForm.reason" :class="inputClass" placeholder="Fête de l'indépendance, inventaire..." /></UiField>
        <p v-if="cError" class="text-[13px] text-terracotta sm:col-span-2" role="alert">{{ cError }}</p>
        <div class="sm:col-span-2"><UiButton type="submit" variant="outline" size="sm" :loading="cSaving"><Plus class="size-4" /> Ajouter une fermeture</UiButton></div>
      </form>
    </section>
  </div>
</template>
