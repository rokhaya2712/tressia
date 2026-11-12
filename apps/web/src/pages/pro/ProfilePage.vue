<script setup lang="ts">
import { ref } from 'vue'
import { usePro } from '@/stores/pro'
import { proApi } from '@/api/pro'
import { ApiError } from '@/api/http'
import UiButton from '@/components/ui/UiButton.vue'
import SalonFields from '@/components/pro/SalonFields.vue'
import ImageUpload from '@/components/pro/ImageUpload.vue'
import { emptySalonForm, formToInput, salonToForm, validateAddress, validateInfo } from '@/components/pro/salonForm'
import { errMsg } from '@/components/pro/time'

const pro = usePro()
const form = ref(pro.salon ? salonToForm(pro.salon) : emptySalonForm())
const errors = ref<Record<string, string>>({})
const error = ref('')
const msg = ref('')
const saving = ref(false)

async function save() {
  msg.value = ''; error.value = ''
  errors.value = { ...validateInfo(form.value), ...validateAddress(form.value) }
  if (Object.keys(errors.value).length) { error.value = 'Vérifiez les champs signalés.'; return }
  saving.value = true
  try {
    pro.set(await proApi.updateSalon(formToInput(form.value)))
    msg.value = 'Modifications enregistrées.'
  } catch (e) {
    if (e instanceof ApiError && e.fields) errors.value = e.fields
    error.value = errMsg(e)
  } finally { saving.value = false }
}
</script>

<template>
  <form class="max-w-3xl space-y-12" novalidate @submit.prevent="save">
    <section>
      <p class="eyebrow text-copper">Image</p>
      <h2 class="mb-4 font-display text-3xl">Photo de couverture</h2>
      <div v-if="form.coverUrl" class="mb-4 overflow-hidden rounded-2xl border border-line"><img :src="form.coverUrl" alt="" class="aspect-[16/7] w-full object-cover" /></div>
      <ImageUpload v-model="form.coverUrl" label="Choisir une couverture" />
    </section>
    <section>
      <p class="eyebrow text-copper">Identité</p>
      <h2 class="mb-4 font-display text-3xl">Informations</h2>
      <SalonFields v-model="form" part="info" :errors="errors" />
    </section>
    <section>
      <p class="eyebrow text-copper">Lieu de travail</p>
      <h2 class="mb-4 font-display text-3xl">Chez vous, chez elles ou les deux</h2>
      <SalonFields v-model="form" part="address" :errors="errors" />
    </section>
    <div class="sticky bottom-0 -mx-5 flex items-center gap-4 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur sm:mx-0 sm:px-0">
      <UiButton type="submit" :loading="saving">Enregistrer</UiButton>
      <span v-if="msg" class="text-[14px] text-sage">{{ msg }}</span>
      <span v-if="error" class="text-[14px] text-terracotta" role="alert">{{ error }}</span>
    </div>
  </form>
</template>
