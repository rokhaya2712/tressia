<script setup lang="ts">
import { X } from '@lucide/vue'
defineProps<{ open: boolean; title: string; eyebrow?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" :aria-label="title">
      <div class="absolute inset-0 bg-ink/40" @click="emit('close')" />
      <aside class="relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p v-if="eyebrow" class="eyebrow text-copper">{{ eyebrow }}</p>
            <h2 class="font-display text-2xl leading-tight text-ink">{{ title }}</h2>
          </div>
          <button type="button" class="rounded-full p-2 text-ink-soft hover:bg-ink/5" aria-label="Fermer" @click="emit('close')"><X class="size-5" /></button>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5"><slot /></div>
        <footer v-if="$slots.footer" class="border-t border-line px-6 py-4"><slot name="footer" /></footer>
      </aside>
    </div>
  </Teleport>
</template>
