import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RegisterInput, UserDto } from '@tressia/shared'
import { http } from '@/api/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserDto | null>(null)
  const loaded = ref(false)
  const isClient = computed(() => user.value?.role === 'client')
  const isOwner = computed(() => user.value?.role === 'owner')
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchMe() {
    try { user.value = (await http.get<{ user: UserDto | null }>('/auth/me')).user } catch { user.value = null }
    loaded.value = true
  }
  async function login(email: string, password: string) {
    user.value = (await http.post<{ user: UserDto }>('/auth/login', { email, password })).user
    return user.value
  }
  async function register(input: RegisterInput) {
    user.value = (await http.post<{ user: UserDto }>('/auth/register', input)).user
    return user.value
  }
  async function logout() {
    await http.post('/auth/logout')
    user.value = null
  }
  return { user, loaded, isClient, isOwner, isAdmin, fetchMe, login, register, logout }
})
