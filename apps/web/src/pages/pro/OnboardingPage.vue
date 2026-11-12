<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check } from '@lucide/vue'
import { formatDuration, type CategoryDto, type SalonDetailDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import { usePro } from '@/stores/pro'
import { ApiError } from '@/api/http'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import { inputClass } from '@/components/ui/fields'
import SalonFields from '@/components/pro/SalonFields.vue'
import HoursEditor from '@/components/pro/HoursEditor.vue'
import { defaultHours, emptySalonForm, flattenHours, formToInput, validateAddress, validateHours, validateInfo } from '@/components/pro/salonForm'
import { errMsg } from '@/components/pro/time'

const router = useRouter()
const pro = usePro()
const steps = ['Votre profil', 'Lieu', 'Disponibilités', 'Première coiffure']
const step = ref(0)
const form = ref(emptySalonForm())
const hours = ref(defaultHours())
const categories = ref<CategoryDto[]>([])
const service = reactive({ categoryId: 0, name: '', priceEur: 5000, durationMin: 60 })
const staffName = ref('')
const errors = ref<Record<string, string>>({})
const error = ref('')
const saving = ref(false)
const durations = Array.from({ length: 40 }, (_, i) => (i + 1) * 15)
let created: SalonDetailDto | null = null
let doneSteps = 0

onMounted(async () => {
  try {
    categories.value = await proApi.categories()
    if (categories.value[0]) service.categoryId = categories.value[0].id
  } catch { /* la liste reste vide */ }
})

function validate(): boolean {
  errors.value = {}; error.value = ''
  if (step.value === 0) errors.value = validateInfo(form.value)
  if (step.value === 1) errors.value = validateAddress(form.value)
  if (step.value === 2) error.value = validateHours(hours.value)
  if (step.value === 3) {
    if (!service.categoryId) errors.value.categoryId = 'Choisissez une catégorie'
    if (service.name.trim().length < 2) errors.value.serviceName = 'Nom de la coiffure requis'
    if (!(service.priceEur >= 0)) errors.value.price = 'Prix invalide'
    if (staffName.value.trim().length < 2) errors.value.staffName = 'Prénom requis'
  }
  return !Object.keys(errors.value).length && !error.value
}
function next() { if (validate()) step.value++ }
const isLast = computed(() => step.value === steps.length - 1)

async function finish() {
  if (!validate()) return
  saving.value = true; error.value = ''
  try {
    if (!created) created = await proApi.createSalon(formToInput(form.value))
    if (doneSteps < 1) { await proApi.putHours(flattenHours(hours.value)); doneSteps = 1 }
    if (doneSteps < 2) {
      await proApi.addService({ categoryId: service.categoryId, name: service.name.trim(), description: null, priceEur: Math.round(service.priceEur), durationMin: service.durationMin, imageUrl: null, active: true, position: 0 })
      doneSteps = 2
    }
    if (doneSteps < 3) { await proApi.addStaff({ name: staffName.value.trim(), photoUrl: null, bio: null, active: true, position: 0 }); doneSteps = 3 }
    pro.set(created)
    await pro.load(true).catch(() => {})
    router.replace({ name: 'pro-dashboard' })
  } catch (e) {
    if (e instanceof ApiError && e.fields) errors.value = e.fields
    error.value = errMsg(e)
  } finally { saving.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-10 sm:py-14">
    <p class="eyebrow text-copper">Bienvenue sur Tressia</p>
    <h1 class="mt-2 font-display text-4xl leading-tight sm:text-5xl">Créons votre profil de tresseuse</h1>
    <p class="mt-2 max-w-xl text-ink-soft">Quatre étapes pour être réservable en ligne. Vous pourrez tout modifier ensuite depuis votre espace.</p>

    <ol class="mt-10 grid grid-cols-4 gap-2 border-b border-line pb-5" aria-label="Étapes">
      <li v-for="(s, i) in steps" :key="s" class="flex items-center gap-2.5" :aria-current="i === step ? 'step' : undefined">
        <span class="grid size-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold"
          :class="i < step ? 'border-sage bg-sage text-cream' : i === step ? 'border-copper bg-copper text-cream' : 'border-line text-ink-soft'">
          <Check v-if="i < step" class="size-4" /><template v-else>{{ i + 1 }}</template>
        </span>
        <span class="hidden text-[13px] font-semibold sm:block" :class="i === step ? 'text-ink' : 'text-ink-soft'">{{ s }}</span>
      </li>
    </ol>

    <form class="mt-8" novalidate @submit.prevent="isLast ? finish() : next()">
      <h2 class="mb-6 font-display text-3xl">{{ steps[step] }}</h2>
      <SalonFields v-if="step === 0" v-model="form" part="info" :errors="errors" />
      <SalonFields v-else-if="step === 1" v-model="form" part="address" :errors="errors" />
      <div v-else-if="step === 2">
        <p class="mb-4 text-[14px] text-ink-soft">Modèle pré-rempli du lundi au samedi de 08:00 à 19:00. Ajoutez une pause ou fermez un jour si besoin.</p>
        <HoursEditor v-model="hours" />
      </div>
      <div v-else class="space-y-8">
        <section>
          <p class="eyebrow mb-3 text-ink-soft">Première coiffure</p>
          <div class="grid gap-5 sm:grid-cols-2">
            <UiField label="Catégorie" :error="errors.categoryId">
              <select v-model.number="service.categoryId" :class="inputClass"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option></select>
            </UiField>
            <UiField label="Nom" :error="errors.serviceName"><input v-model="service.name" :class="inputClass" placeholder="Ex. Knotless braids moyennes" /></UiField>
            <UiField label="Prix (€)" :error="errors.price"><input v-model.number="service.priceEur" type="number" min="0" step="1" :class="inputClass" /></UiField>
            <UiField label="Durée">
              <select v-model.number="service.durationMin" :class="inputClass"><option v-for="d in durations" :key="d" :value="d">{{ formatDuration(d) }}</option></select>
            </UiField>
          </div>
        </section>
        <section>
          <p class="eyebrow mb-3 text-ink-soft">Qui tresse ?</p>
          <UiField label="Prénom affiché" :error="errors.staffName" hint="Vous-même, en général.">
            <input v-model="staffName" :class="inputClass" placeholder="Ex. Akofa" />
          </UiField>
        </section>
      </div>

      <p v-if="error" class="mt-6 rounded-xl bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta" role="alert">{{ error }}</p>
      <div class="mt-10 flex items-center justify-between border-t border-line pt-6">
        <UiButton v-if="step > 0" variant="ghost" :disabled="saving" @click="step--">Retour</UiButton>
        <span v-else />
        <UiButton type="submit" :loading="saving">{{ isLast ? 'Créer mon profil' : 'Continuer' }}</UiButton>
      </div>
    </form>
  </div>
</template>
