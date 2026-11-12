<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Pencil, Plus, Trash } from '@lucide/vue'
import { formatDuration, formatEuro, type CategoryDto, type ServiceDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import { ApiError } from '@/api/http'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { inputClass, textareaClass } from '@/components/ui/fields'
import SidePanel from '@/components/pro/SidePanel.vue'
import ImageUpload from '@/components/pro/ImageUpload.vue'
import { errMsg } from '@/components/pro/time'

const services = ref<ServiceDto[]>([])
const categories = ref<CategoryDto[]>([])
const loading = ref(true)
const error = ref('')
const durations = Array.from({ length: 40 }, (_, i) => (i + 1) * 15)

interface Form { id: number | null; categoryId: number; name: string; description: string; priceEur: number; durationMin: number; imageUrl: string | null; active: boolean; position: number }
const editing = ref<Form | null>(null)
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
const notice = ref('')

onMounted(async () => {
  try { [services.value, categories.value] = await Promise.all([proApi.getServices(), proApi.categories()]) } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
})

const groups = computed(() => categories.value
  .map((c) => ({ cat: c, items: services.value.filter((s) => s.categoryId === c.id).sort((a, b) => a.position - b.position) }))
  .filter((g) => g.items.length))

function openNew() {
  errors.value = {}; formError.value = ''
  editing.value = { id: null, categoryId: categories.value[0]?.id ?? 0, name: '', description: '', priceEur: 5000, durationMin: 60, imageUrl: null, active: true, position: services.value.length }
}
function openEdit(s: ServiceDto) {
  errors.value = {}; formError.value = ''
  editing.value = { id: s.id, categoryId: s.categoryId, name: s.name, description: s.description ?? '', priceEur: s.priceEur, durationMin: s.durationMin, imageUrl: s.imageUrl, active: s.active, position: s.position }
}

async function save() {
  const f = editing.value
  if (!f) return
  errors.value = {}; formError.value = ''
  if (f.name.trim().length < 2) errors.value.name = 'Nom requis'
  if (!(f.priceEur >= 0)) errors.value.priceEur = 'Prix invalide'
  if (!f.categoryId) errors.value.categoryId = 'Catégorie requise'
  if (Object.keys(errors.value).length) return
  const body = { categoryId: f.categoryId, name: f.name.trim(), description: f.description.trim() || null, priceEur: Math.round(f.priceEur), durationMin: f.durationMin, imageUrl: f.imageUrl, active: f.active, position: f.position }
  saving.value = true
  try {
    if (f.id) {
      const s = await proApi.updateService(f.id, body)
      services.value = services.value.map((x) => (x.id === f.id ? s : x))
    } else services.value.push(await proApi.addService(body))
    editing.value = null
  } catch (e) {
    if (e instanceof ApiError && e.fields) errors.value = e.fields
    formError.value = errMsg(e)
  } finally { saving.value = false }
}
async function remove(s: ServiceDto) {
  if (!confirm(`Supprimer la coiffure « ${s.name} » ?`)) return
  try {
    const res = await proApi.deleteService(s.id)
    if (res?.deactivated) {
      services.value = services.value.map((x) => (x.id === s.id ? { ...x, active: false } : x))
      notice.value = `« ${s.name} » a déjà des réservations : elle a été désactivée au lieu d'être supprimée.`
    } else services.value = services.value.filter((x) => x.id !== s.id)
    editing.value = null
  } catch (e) { alert(errMsg(e)) }
}
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <p class="max-w-xl text-ink-soft">Vos coiffures, leurs prix et leurs durées. Les coiffures inactives n'apparaissent pas sur votre page.</p>
    <UiButton @click="openNew"><Plus class="size-4" /> Nouvelle coiffure</UiButton>
  </div>
  <p v-if="notice" class="mb-6 rounded-xl bg-copper/12 px-4 py-3 text-[14px] text-ink">{{ notice }}</p>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <p v-else-if="!services.length" class="border-y border-line py-14 text-center text-ink-soft">Aucune coiffure pour l'instant.</p>
  <div v-else class="space-y-10">
    <section v-for="g in groups" :key="g.cat.id">
      <h2 class="mb-2 font-display text-2xl">{{ g.cat.label }} <span class="text-base text-ink-soft">({{ g.items.length }})</span></h2>
      <ul class="divide-y divide-line border-y border-line">
        <li v-for="s in g.items" :key="s.id" class="flex items-center gap-4 py-3" :class="!s.active && 'opacity-55'">
          <img v-if="s.imageUrl" :src="s.imageUrl" alt="" class="size-14 shrink-0 rounded-lg object-cover" />
          <div v-else class="size-14 shrink-0 rounded-lg bg-sand/70" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ s.name }} <span v-if="!s.active" class="ml-1 rounded-full bg-ink/8 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">Inactive</span></p>
            <p class="truncate text-[13px] text-ink-soft">{{ formatDuration(s.durationMin) }}<template v-if="s.description"> · {{ s.description }}</template></p>
          </div>
          <p class="shrink-0 font-semibold">{{ formatEuro(s.priceEur) }}</p>
          <div class="flex shrink-0 gap-1">
            <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-ink/5 hover:text-ink" :aria-label="`Modifier ${s.name}`" @click="openEdit(s)"><Pencil class="size-4" /></button>
            <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-terracotta/10 hover:text-terracotta" :aria-label="`Supprimer ${s.name}`" @click="remove(s)"><Trash class="size-4" /></button>
          </div>
        </li>
      </ul>
    </section>
  </div>

  <SidePanel :open="!!editing" :title="editing?.id ? 'Modifier la coiffure' : 'Nouvelle coiffure'" eyebrow="Catalogue" @close="editing = null">
    <form v-if="editing" id="service-form" class="space-y-5" novalidate @submit.prevent="save">
      <UiField label="Catégorie" :error="errors.categoryId">
        <select v-model.number="editing.categoryId" :class="inputClass"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option></select>
      </UiField>
      <UiField label="Nom" :error="errors.name"><input v-model="editing.name" :class="inputClass" /></UiField>
      <UiField label="Description" :error="errors.description"><textarea v-model="editing.description" :class="textareaClass" /></UiField>
      <div class="grid grid-cols-2 gap-4">
        <UiField label="Prix (€)" :error="errors.priceEur"><input v-model.number="editing.priceEur" type="number" min="0" step="1" :class="inputClass" /></UiField>
        <UiField label="Durée" :error="errors.durationMin">
          <select v-model.number="editing.durationMin" :class="inputClass"><option v-for="d in durations" :key="d" :value="d">{{ formatDuration(d) }}</option></select>
        </UiField>
      </div>
      <div>
        <p class="mb-1.5 text-[13px] font-semibold text-ink-soft">Photo</p>
        <ImageUpload v-model="editing.imageUrl" />
      </div>
      <label class="flex items-center gap-2.5 text-[14px] font-semibold"><input v-model="editing.active" type="checkbox" class="size-4 accent-copper" /> Coiffure active (réservable)</label>
      <p v-if="formError" class="text-[13px] text-terracotta" role="alert">{{ formError }}</p>
    </form>
    <template #footer>
      <div class="flex gap-2">
        <UiButton variant="ghost" @click="editing = null">Annuler</UiButton>
        <UiButton type="submit" form="service-form" class="flex-1" :loading="saving">Enregistrer</UiButton>
      </div>
    </template>
  </SidePanel>
</template>
