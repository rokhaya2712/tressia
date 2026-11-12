<script setup lang="ts">
defineProps<{ label: string; error?: string; hint?: string; for?: string }>()
</script>

<template>
  <label class="block" :for="$props.for">
    <span class="mb-1.5 block text-[13px] font-semibold text-ink-soft">{{ label }}</span>
    <slot />
    <span v-if="error" class="mt-1 block text-[13px] text-terracotta" role="alert">{{ error }}</span>
    <span v-else-if="hint" class="mt-1 block text-[13px] text-ink-soft/70">{{ hint }}</span>
  </label>
</template>
