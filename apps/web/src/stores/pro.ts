import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SalonDetailDto } from '@tressia/shared'
import { ApiError } from '@/api/http'
import { proApi } from '@/api/pro'

/** Salon de l'owner connecte, charge une seule fois. `missing` = pas encore de salon (onboarding). */
export const usePro = defineStore('pro', () => {
  const salon = ref<SalonDetailDto | null>(null)
  const loaded = ref(false)
  const missing = ref(false)
  let pending: Promise<void> | null = null

  function load(force = false): Promise<void> {
    if (loaded.value && !force) return Promise.resolve()
    if (pending && !force) return pending
    pending = proApi.getSalon()
      .then((s) => { salon.value = s; missing.value = false })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) { salon.value = null; missing.value = true }
        else throw e
      })
      .finally(() => { loaded.value = true; pending = null })
    return pending
  }
  function set(s: SalonDetailDto) { salon.value = s; missing.value = false; loaded.value = true }
  function reset() { salon.value = null; loaded.value = false; missing.value = false }

  return { salon, loaded, missing, load, set, reset }
})
