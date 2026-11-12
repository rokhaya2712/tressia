<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { AdminSalonDto, SalonStatus } from '@tressia/shared'
import { adminApi } from '@/api/admin'
import UiButton from '@/components/ui/UiButton.vue'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { errMsg, formatDate } from '@/components/pro/time'

const tabs: { key: SalonStatus; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'published', label: 'Publiés' },
  { key: 'suspended', label: 'Suspendus' },
]
const tab = ref<SalonStatus>('pending')
const salons = ref<AdminSalonDto[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref<number | null>(null)

async function load() {
  loading.value = true; error.value = ''
  try { salons.value = await adminApi.salons(tab.value) } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
}
onMounted(load)
watch(tab, load)

async function act(s: AdminSalonDto, action: 'publish' | 'suspend') {
  if (action === 'suspend' && !confirm(`Suspendre « ${s.name} » ? Il ne sera plus visible ni réservable.`)) return
  busy.value = s.id
  try {
    await (action === 'publish' ? adminApi.publish(s.id) : adminApi.suspend(s.id))
    salons.value = salons.value.filter((x) => x.id !== s.id)
  } catch (e) { alert(errMsg(e)) } finally { busy.value = null }
}
</script>

<template>
  <div class="mb-6 inline-flex rounded-full border border-line p-0.5" role="tablist">
    <button v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="tab === t.key" class="h-9 rounded-full px-5 text-[13px] font-semibold" :class="tab === t.key ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'" @click="tab = t.key">{{ t.label }}</button>
  </div>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <p v-else-if="!salons.length" class="border-y border-line py-14 text-center text-ink-soft">Aucun salon dans cette liste.</p>
  <div v-else class="overflow-x-auto border-y border-line">
    <table class="w-full min-w-[820px] text-left text-[14px]">
      <thead>
        <tr class="eyebrow border-b border-line text-ink-soft">
          <th class="py-3 pr-4 font-semibold">Tresseuse</th>
          <th class="py-3 pr-4 font-semibold">Propriétaire</th>
          <th class="py-3 pr-4 font-semibold">Ville</th>
          <th class="py-3 pr-4 text-right font-semibold">Services</th>
          <th class="py-3 pr-4 text-right font-semibold">RDV</th>
          <th class="py-3 pr-4 font-semibold">Créé le</th>
          <th class="py-3 text-right font-semibold">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="s in salons" :key="s.id">
          <td class="py-3 pr-4">
            <RouterLink v-if="s.status === 'published'" :to="`/salons/${s.slug}`" class="font-display text-lg text-ink hover:text-copper">{{ s.name }}</RouterLink>
            <span v-else class="font-display text-lg">{{ s.name }}</span>
          </td>
          <td class="py-3 pr-4">{{ s.ownerName }}<span class="block text-[12px] text-ink-soft">{{ s.ownerEmail }}</span></td>
          <td class="py-3 pr-4">{{ s.city }}<span class="block text-[12px] text-ink-soft">{{ s.neighborhood }}</span></td>
          <td class="py-3 pr-4 text-right tabular-nums">{{ s.serviceCount }}</td>
          <td class="py-3 pr-4 text-right tabular-nums">{{ s.bookingCount }}</td>
          <td class="py-3 pr-4 text-ink-soft">{{ formatDate(s.createdAt) }}</td>
          <td class="py-3 text-right">
            <UiButton v-if="s.status === 'pending'" size="sm" :loading="busy === s.id" @click="act(s, 'publish')">Publier</UiButton>
            <UiButton v-else-if="s.status === 'published'" size="sm" variant="outline" :loading="busy === s.id" @click="act(s, 'suspend')">Suspendre</UiButton>
            <UiButton v-else size="sm" variant="ink" :loading="busy === s.id" @click="act(s, 'publish')">Réactiver</UiButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
