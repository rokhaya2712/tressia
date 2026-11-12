<script setup lang="ts">
import { ref } from 'vue'
import { Upload, X } from '@lucide/vue'
import { proApi } from '@/api/pro'
import { errMsg } from './time'

const model = defineModel<string | null | undefined>()
withDefaults(defineProps<{ round?: boolean; label?: string }>(), { label: 'Ajouter une photo' })
const busy = ref(false)
const error = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { error.value = 'Image trop lourde (5 Mo maximum)'; return }
  busy.value = true; error.value = ''
  try { model.value = (await proApi.upload(file)).url } catch (err) { error.value = errMsg(err) } finally { busy.value = false }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-4">
      <div class="relative grid size-20 shrink-0 place-items-center overflow-hidden border border-line bg-sand/60" :class="round ? 'rounded-full' : 'rounded-xl'">
        <img v-if="model" :src="model" alt="" class="size-full object-cover" />
        <Upload v-else class="size-5 text-ink-soft/60" />
        <div v-if="busy" class="absolute inset-0 grid place-items-center bg-cream/70"><span class="size-5 animate-spin rounded-full border-2 border-copper border-r-transparent" /></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <label class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-ink/80 px-4 text-[13px] font-semibold text-ink transition hover:bg-ink hover:text-cream">
          <Upload class="size-4" /> {{ model ? 'Remplacer' : label }}
          <input type="file" accept="image/*" class="sr-only" @change="onFile" />
        </label>
        <button v-if="model" type="button" class="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13px] text-ink-soft hover:bg-ink/5" @click="model = null"><X class="size-4" /> Retirer</button>
      </div>
    </div>
    <p v-if="error" class="mt-2 text-[13px] text-terracotta">{{ error }}</p>
  </div>
</template>
