<script setup lang="ts">
import { Star } from '@lucide/vue'
defineProps<{ value: number; size?: string }>()
</script>

<template>
  <span class="inline-flex gap-0.5" :aria-label="`${value} sur 5`" role="img">
    <Star v-for="i in 5" :key="i" :class="[size ?? 'size-3.5', i <= Math.round(value) ? 'fill-copper text-copper' : 'text-line']" aria-hidden="true" />
  </span>
</template>
