<script setup lang="ts">
defineProps<{ n: string; title: string; done?: boolean; summary?: string }>()
</script>

<template>
  <div class="flex items-baseline gap-4 border-t border-ink pt-5">
    <span class="font-display text-4xl italic leading-none" :class="done ? 'text-copper' : 'text-ink'">{{ n }}</span>
    <div class="min-w-0 flex-1">
      <h2 class="font-display text-3xl leading-tight sm:text-4xl">{{ title }}</h2>
      <p v-if="summary" class="mt-1 truncate text-sm text-ink-soft">{{ summary }}</p>
    </div>
  </div>
</template>
