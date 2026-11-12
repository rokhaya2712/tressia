<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  variant?: 'copper' | 'ink' | 'terracotta' | 'outline' | 'ghost' | 'cream'
  size?: 'sm' | 'md' | 'lg'
  to?: RouteLocationRaw
  href?: string
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>(), { variant: 'copper', size: 'md', type: 'button' })

const tag = computed(() => (props.to ? 'RouterLink' : props.href ? 'a' : 'button'))
const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-[background,color,transform,box-shadow] duration-300 ease-[var(--ease-editorial)] active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none',
  { sm: 'h-9 px-4 text-[13px]', md: 'h-11 px-6 text-sm', lg: 'h-14 px-8 text-[15px]' }[props.size],
  {
    copper: 'bg-copper text-cream hover:bg-ink',
    ink: 'bg-ink text-cream hover:bg-terracotta',
    terracotta: 'bg-terracotta text-cream hover:bg-terracotta-deep',
    outline: 'border border-ink/80 text-ink hover:bg-ink hover:text-cream',
    ghost: 'text-ink hover:bg-ink/5',
    cream: 'bg-cream text-ink hover:bg-sand',
  }[props.variant],
  props.block && 'w-full',
])
</script>

<template>
  <component
    :is="tag === 'RouterLink' ? 'RouterLink' : tag"
    :to="to"
    :href="href"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? disabled || loading : undefined"
    :class="classes"
  >
    <span v-if="loading" class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
    <slot />
  </component>
</template>
