<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Role } from '@tressia/shared'
import { adminApi, type AdminUserDto } from '@/api/admin'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { inputClass } from '@/components/ui/fields'
import { errMsg, formatDate } from '@/components/pro/time'

const users = ref<AdminUserDto[]>([])
const loading = ref(true)
const error = ref('')
const q = ref('')
const roleLabel: Record<Role, string> = { client: 'Cliente', owner: 'Tresseuse', admin: 'Admin' }
const roleTone: Record<Role, string> = { client: 'bg-ink/8 text-ink-soft', owner: 'bg-copper/15 text-copper', admin: 'bg-sage/15 text-sage' }

onMounted(async () => {
  try { users.value = await adminApi.users() } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
})
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s ? users.value.filter((u) => `${u.fullName} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(s)) : users.value
})
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <p class="text-ink-soft">{{ users.length }} comptes inscrits</p>
    <input v-model="q" type="search" :class="inputClass" class="max-w-xs" placeholder="Rechercher un nom, un e-mail" aria-label="Rechercher" />
  </div>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <div v-else class="overflow-x-auto border-y border-line">
    <table class="w-full min-w-[680px] text-left text-[14px]">
      <thead>
        <tr class="eyebrow border-b border-line text-ink-soft">
          <th class="py-3 pr-4 font-semibold">Nom</th>
          <th class="py-3 pr-4 font-semibold">E-mail</th>
          <th class="py-3 pr-4 font-semibold">Téléphone</th>
          <th class="py-3 pr-4 font-semibold">Rôle</th>
          <th class="py-3 font-semibold">Inscrit le</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="u in filtered" :key="u.id">
          <td class="py-3 pr-4 font-semibold">{{ u.fullName }}</td>
          <td class="py-3 pr-4">{{ u.email }}</td>
          <td class="py-3 pr-4 text-ink-soft">{{ u.phone || 'Non renseigné' }}</td>
          <td class="py-3 pr-4"><span class="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" :class="roleTone[u.role]">{{ roleLabel[u.role] }}</span></td>
          <td class="py-3 text-ink-soft">{{ formatDate(u.createdAt) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!filtered.length" class="py-10 text-center text-ink-soft">Aucun résultat.</p>
  </div>
</template>
