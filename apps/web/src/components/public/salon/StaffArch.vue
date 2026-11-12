<script setup lang="ts">
import { computed } from 'vue'
import { formatTime, type StaffDto, type StaffTodayDto } from '@tressia/shared'
import { initials } from '@/composables/format'

const props = defineProps<{ staff: StaffDto; today?: StaffTodayDto }>()
const status = computed(() => {
  const t = props.today
  if (!t) return null
  if (t.fullToday) return { text: 'Complet aujourd’hui', free: false }
  if (t.freeUntil) return { text: `Libre jusqu’à ${formatTime(t.freeUntil)}`, free: true }
  if (t.nextFreeAt) return { text: `Prochain créneau ${formatTime(t.nextFreeAt)}`, free: true }
  return null
})
</script>

<template>
  <figure class="w-40 shrink-0 sm:w-48">
    <div class="relative aspect-[3/4] overflow-hidden rounded-t-full bg-sand">
      <img v-if="staff.photoUrl" :src="staff.photoUrl" :alt="`Portrait de ${staff.name}`" loading="lazy" class="size-full object-cover" />
      <div v-else class="grid size-full place-items-center font-display text-5xl text-ink/30">{{ initials(staff.name) }}</div>
    </div>
    <figcaption class="mt-3">
      <p class="font-display text-2xl leading-tight">{{ staff.name }}</p>
      <p v-if="status" class="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold" :class="status.free ? 'text-sage' : 'text-ink-soft/60'">
        <span class="size-2 rounded-full" :class="status.free ? 'bg-sage' : 'bg-ink-soft/40'" aria-hidden="true" />{{ status.text }}
      </p>
    </figcaption>
  </figure>
</template>
