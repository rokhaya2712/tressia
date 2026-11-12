<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pencil, Plus, Trash } from '@lucide/vue'
import type { StaffDto, TimeOffDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import { ApiError } from '@/api/http'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { inputClass, textareaClass } from '@/components/ui/fields'
import SidePanel from '@/components/pro/SidePanel.vue'
import ImageUpload from '@/components/pro/ImageUpload.vue'
import { errMsg, formatDateTime, localInputToIso } from '@/components/pro/time'

const staff = ref<StaffDto[]>([])
const loading = ref(true)
const error = ref('')

interface Form { id: number | null; name: string; bio: string; photoUrl: string | null; active: boolean; position: number }
const editing = ref<Form | null>(null)
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
const notice = ref('')

const timeOff = ref<TimeOffDto[]>([])
const offForm = ref({ startsAt: '', endsAt: '', reason: '' })
const offError = ref('')
const offSaving = ref(false)

onMounted(async () => {
  try { staff.value = (await proApi.getStaff()).sort((a, b) => a.position - b.position) } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
})

function reset() { errors.value = {}; formError.value = ''; offError.value = ''; timeOff.value = []; offForm.value = { startsAt: '', endsAt: '', reason: '' } }
function openNew() { reset(); editing.value = { id: null, name: '', bio: '', photoUrl: null, active: true, position: staff.value.length } }
async function openEdit(s: StaffDto) {
  reset()
  editing.value = { id: s.id, name: s.name, bio: s.bio ?? '', photoUrl: s.photoUrl, active: s.active, position: s.position }
  try { timeOff.value = await proApi.getTimeOff(s.id) } catch { timeOff.value = [] }
}

async function save() {
  const f = editing.value
  if (!f) return
  errors.value = {}; formError.value = ''
  if (f.name.trim().length < 2) { errors.value.name = 'Nom requis'; return }
  const body = { name: f.name.trim(), bio: f.bio.trim() || null, photoUrl: f.photoUrl, active: f.active, position: f.position }
  saving.value = true
  try {
    if (f.id) {
      const s = await proApi.updateStaff(f.id, body)
      staff.value = staff.value.map((x) => (x.id === f.id ? s : x))
      editing.value = null
    } else {
      const s = await proApi.addStaff(body)
      staff.value.push(s)
      f.id = s.id // reste ouvert pour saisir des indisponibilites
    }
  } catch (e) {
    if (e instanceof ApiError && e.fields) errors.value = e.fields
    formError.value = errMsg(e)
  } finally { saving.value = false }
}
async function remove(s: StaffDto) {
  if (!confirm(`Retirer ${s.name} de l'équipe ?`)) return
  notice.value = ''
  try {
    const res = await proApi.deleteStaff(s.id)
    if (res?.deactivated) {
      staff.value = staff.value.map((x) => (x.id === s.id ? { ...x, active: false } : x))
      notice.value = `${s.name} a un historique de rendez-vous : le profil a été désactivé au lieu d'être supprimé.`
    } else staff.value = staff.value.filter((x) => x.id !== s.id)
  } catch (e) {
    if (e instanceof ApiError && e.code === 'staff_has_bookings') notice.value = `${s.name} a encore des rendez-vous à venir. Annulez-les ou réaffectez-les avant de le retirer.`
    else alert(errMsg(e))
  }
}
async function addOff() {
  const id = editing.value?.id
  if (!id) return
  offError.value = ''
  const { startsAt, endsAt, reason } = offForm.value
  if (!startsAt || !endsAt) { offError.value = 'Indiquez le début et la fin.'; return }
  if (startsAt >= endsAt) { offError.value = 'La fin doit être après le début.'; return }
  offSaving.value = true
  try {
    timeOff.value.push(await proApi.addTimeOff(id, { startsAt: localInputToIso(startsAt), endsAt: localInputToIso(endsAt), reason: reason.trim() || null }))
    offForm.value = { startsAt: '', endsAt: '', reason: '' }
  } catch (e) { offError.value = errMsg(e) } finally { offSaving.value = false }
}
async function removeOff(o: TimeOffDto) {
  try { await proApi.deleteTimeOff(o.staffId, o.id); timeOff.value = timeOff.value.filter((x) => x.id !== o.id) } catch (e) { offError.value = errMsg(e) }
}
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <p class="max-w-xl text-ink-soft">Vous, et éventuellement les personnes qui tressent avec vous. Chacune a son planning : déclarez ici les congés et absences.</p>
    <UiButton @click="openNew"><Plus class="size-4" /> Ajouter une personne</UiButton>
  </div>
  <p v-if="notice" class="mb-6 rounded-xl bg-copper/12 px-4 py-3 text-[14px] text-ink">{{ notice }}</p>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <p v-else-if="!staff.length" class="border-y border-line py-14 text-center text-ink-soft">Personne pour l'instant.</p>
  <ul v-else class="divide-y divide-line border-y border-line">
    <li v-for="s in staff" :key="s.id" class="flex items-center gap-4 py-4" :class="!s.active && 'opacity-55'">
      <img v-if="s.photoUrl" :src="s.photoUrl" alt="" class="size-14 shrink-0 rounded-full object-cover" />
      <div v-else class="grid size-14 shrink-0 place-items-center rounded-full bg-sand font-display text-xl text-ink-soft">{{ s.name.charAt(0) }}</div>
      <div class="min-w-0 flex-1">
        <p class="font-semibold">{{ s.name }} <span v-if="!s.active" class="ml-1 rounded-full bg-ink/8 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">Inactif</span></p>
        <p class="truncate text-[13px] text-ink-soft">{{ s.bio || 'Pas de présentation' }}</p>
      </div>
      <div class="flex shrink-0 gap-1">
        <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-ink/5 hover:text-ink" :aria-label="`Modifier ${s.name}`" @click="openEdit(s)"><Pencil class="size-4" /></button>
        <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-terracotta/10 hover:text-terracotta" :aria-label="`Supprimer ${s.name}`" @click="remove(s)"><Trash class="size-4" /></button>
      </div>
    </li>
  </ul>

  <SidePanel :open="!!editing" :title="editing?.id ? editing.name || 'Tresseuse' : 'Nouvelle personne'" eyebrow="Planning" @close="editing = null">
    <template v-if="editing">
      <form id="staff-form" class="space-y-5" novalidate @submit.prevent="save">
        <ImageUpload v-model="editing.photoUrl" round label="Ajouter un portrait" />
        <UiField label="Nom" :error="errors.name"><input v-model="editing.name" :class="inputClass" /></UiField>
        <UiField label="Présentation" :error="errors.bio" hint="300 caractères maximum."><textarea v-model="editing.bio" maxlength="300" :class="textareaClass" /></UiField>
        <label class="flex items-center gap-2.5 text-[14px] font-semibold"><input v-model="editing.active" type="checkbox" class="size-4 accent-copper" /> Actif (réservable)</label>
        <p v-if="formError" class="text-[13px] text-terracotta" role="alert">{{ formError }}</p>
      </form>

      <section v-if="editing.id" class="mt-8 border-t border-line pt-6">
        <p class="eyebrow text-copper">Indisponibilités</p>
        <h3 class="font-display text-xl">Congés et absences</h3>
        <ul v-if="timeOff.length" class="mt-3 divide-y divide-line border-y border-line">
          <li v-for="o in timeOff" :key="o.id" class="flex items-center justify-between gap-3 py-2.5 text-[14px]">
            <span>{{ formatDateTime(o.startsAt) }} au {{ formatDateTime(o.endsAt) }}<span v-if="o.reason" class="block text-[12px] text-ink-soft">{{ o.reason }}</span></span>
            <button type="button" class="rounded-full p-1.5 text-ink-soft hover:text-terracotta" aria-label="Supprimer l'indisponibilité" @click="removeOff(o)"><Trash class="size-4" /></button>
          </li>
        </ul>
        <p v-else class="mt-2 text-[14px] text-ink-soft">Aucune indisponibilité prévue.</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <UiField label="Début"><input v-model="offForm.startsAt" type="datetime-local" step="900" :class="inputClass" /></UiField>
          <UiField label="Fin"><input v-model="offForm.endsAt" type="datetime-local" step="900" :class="inputClass" /></UiField>
          <UiField label="Motif (facultatif)" class="sm:col-span-2"><input v-model="offForm.reason" :class="inputClass" placeholder="Congé, formation..." /></UiField>
        </div>
        <p v-if="offError" class="mt-2 text-[13px] text-terracotta" role="alert">{{ offError }}</p>
        <UiButton variant="outline" size="sm" class="mt-3" :loading="offSaving" @click="addOff"><Plus class="size-4" /> Ajouter l'indisponibilité</UiButton>
      </section>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UiButton variant="ghost" @click="editing = null">Fermer</UiButton>
        <UiButton type="submit" form="staff-form" class="flex-1" :loading="saving">Enregistrer</UiButton>
      </div>
    </template>
  </SidePanel>
</template>
