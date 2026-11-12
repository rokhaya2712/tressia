<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { registerSchema, type UserDto } from '@tressia/shared'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { inputClass } from '@/components/ui/fields'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'

const props = withDefaults(defineProps<{ mode: 'login' | 'register'; role?: 'client' | 'owner'; compact?: boolean }>(), { role: 'client' })
const emit = defineEmits<{ done: [user: UserDto, registered: boolean] }>()

const auth = useAuthStore()
const form = reactive({ fullName: '', phone: '', email: '', password: '' })
const errors = ref<Record<string, string>>({})
const general = ref('')
const busy = ref(false)
const uid = Math.random().toString(36).slice(2, 8)
watch(() => props.mode, () => { errors.value = {}; general.value = '' })

async function submit() {
  errors.value = {}; general.value = ''
  if (props.mode === 'register') {
    const parsed = registerSchema.safeParse({ ...form, role: props.role })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? '')
        if (k && !errors.value[k]) errors.value[k] = issue.message
      }
      return
    }
  } else if (!form.email || !form.password) {
    if (!form.email) errors.value.email = 'Indiquez votre e-mail'
    if (!form.password) errors.value.password = 'Indiquez votre mot de passe'
    return
  }
  busy.value = true
  try {
    const user = props.mode === 'login'
      ? await auth.login(form.email.trim(), form.password)
      : await auth.register({ fullName: form.fullName, phone: form.phone, email: form.email, password: form.password, role: props.role })
    emit('done', user, props.mode === 'register')
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.fields) errors.value = { ...e.fields }
      if (e.code === 'invalid_credentials') general.value = 'E-mail ou mot de passe incorrect.'
      else if (e.code === 'email_taken') errors.value.email = 'Un compte existe déjà avec cet e-mail.'
      else if (!e.fields) general.value = e.message
    } else general.value = 'Connexion au serveur impossible. Réessayez dans un instant.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="submit">
    <p v-if="general" class="rounded-xl border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta" role="alert">{{ general }}</p>
    <template v-if="mode === 'register'">
      <UiField :label="role === 'owner' ? 'Votre nom complet (gérant)' : 'Nom complet'" :error="errors.fullName" :for="`fn-${uid}`">
        <input :id="`fn-${uid}`" v-model="form.fullName" autocomplete="name" :class="inputClass" :aria-invalid="!!errors.fullName" />
      </UiField>
      <UiField label="Téléphone" :error="errors.phone" hint="La tresseuse pourra vous joindre en cas d’imprévu." :for="`ph-${uid}`">
        <input :id="`ph-${uid}`" v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 12 34 56 78" :class="inputClass" :aria-invalid="!!errors.phone" />
      </UiField>
    </template>
    <UiField label="E-mail" :error="errors.email" :for="`em-${uid}`">
      <input :id="`em-${uid}`" v-model="form.email" type="email" autocomplete="email" inputmode="email" :class="inputClass" :aria-invalid="!!errors.email" />
    </UiField>
    <UiField label="Mot de passe" :error="errors.password" :hint="mode === 'register' ? '8 caractères minimum.' : undefined" :for="`pw-${uid}`">
      <input :id="`pw-${uid}`" v-model="form.password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :class="inputClass" :aria-invalid="!!errors.password" />
    </UiField>
    <UiButton type="submit" :variant="compact ? 'ink' : 'terracotta'" size="lg" block :loading="busy">
      {{ mode === 'login' ? 'Se connecter' : role === 'owner' ? 'Créer mon compte tresseuse' : 'Créer mon compte' }}
    </UiButton>
  </form>
</template>
