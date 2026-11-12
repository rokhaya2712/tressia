<script setup lang="ts">
import { formatDuration, formatEuro, type ServiceDto } from '@tressia/shared'
import { Check } from '@lucide/vue'

defineProps<{ service: ServiceDto; selected: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <label
    class="group grid cursor-pointer grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-line py-5 transition-colors sm:grid-cols-[88px_minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:gap-6"
    :class="selected ? 'bg-sand/50' : 'hover:bg-sand/30'"
  >
    <div class="size-16 overflow-hidden rounded-2xl bg-sand sm:size-[88px]">
      <img v-if="service.imageUrl" :src="service.imageUrl" alt="" loading="lazy" class="size-full object-cover" />
      <div v-else class="grid size-full place-items-center font-display text-2xl italic text-ink/30">{{ service.name.charAt(0) }}</div>
    </div>
    <div class="min-w-0">
      <p class="font-display text-xl uppercase leading-tight tracking-wide text-ink sm:text-2xl">{{ service.name }}</p>
      <p class="mt-1 text-sm text-ink-soft">{{ formatDuration(service.durationMin) }} <span class="text-line">/</span> <strong class="font-semibold text-ink">{{ formatEuro(service.priceEur) }}</strong></p>
      <p v-if="service.description" class="mt-1 line-clamp-2 text-sm text-ink-soft/80 sm:hidden">{{ service.description }}</p>
    </div>
    <p class="hidden text-sm leading-relaxed text-ink-soft sm:block">{{ service.description }}</p>
    <span class="relative grid size-11 place-items-center">
      <input type="checkbox" class="peer absolute inset-0 cursor-pointer opacity-0" :checked="selected" :aria-label="`Choisir ${service.name}`" @change="$emit('toggle')" />
      <span
        class="grid size-7 place-items-center rounded-full border transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-copper"
        :class="selected ? 'border-terracotta bg-terracotta text-cream' : 'border-ink/40 text-transparent group-hover:border-ink'"
      ><Check class="size-4" aria-hidden="true" /></span>
    </span>
  </label>
</template>
