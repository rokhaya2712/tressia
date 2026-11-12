<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Trash, Upload } from '@lucide/vue'
import type { PhotoDto } from '@tressia/shared'
import { proApi } from '@/api/pro'
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { errMsg } from '@/components/pro/time'

const photos = ref<PhotoDto[]>([])
const loading = ref(true)
const error = ref('')
const uploading = ref(0)
const msg = ref('')

onMounted(async () => {
  try { photos.value = (await proApi.getGallery()).sort((a, b) => a.position - b.position) } catch (e) { error.value = errMsg(e) } finally { loading.value = false }
})

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  msg.value = ''
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { msg.value = `${f.name} dépasse 5 Mo et a été ignorée.`; continue }
    uploading.value++
    try {
      const { url } = await proApi.upload(f)
      photos.value.push(await proApi.addPhoto(url))
    } catch (err) { msg.value = errMsg(err) } finally { uploading.value-- }
  }
}
async function remove(p: PhotoDto) {
  if (!confirm('Supprimer cette photo ?')) return
  try { await proApi.deletePhoto(p.id); photos.value = photos.value.filter((x) => x.id !== p.id) } catch (e) { msg.value = errMsg(e) }
}
async function move(i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= photos.value.length) return
  const list = [...photos.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  const previous = photos.value
  photos.value = list
  try { await proApi.reorderGallery(list.map((p) => p.id)) } catch (e) { photos.value = previous; msg.value = errMsg(e) }
}
</script>

<template>
  <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
    <p class="max-w-xl text-ink-soft">Vos plus belles réalisations. La première photo sert d'aperçu sur votre page. Formats image, 5 Mo maximum.</p>
    <label class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-copper px-6 text-sm font-semibold text-cream transition hover:bg-ink">
      <Upload class="size-4" /> Ajouter des photos
      <input type="file" accept="image/*" multiple class="sr-only" @change="onFiles" />
    </label>
  </div>
  <p v-if="msg" class="mb-4 text-[14px] text-terracotta" role="alert">{{ msg }}</p>
  <p v-if="error" class="text-terracotta">{{ error }}</p>
  <UiSpinner v-else-if="loading" />
  <p v-else-if="!photos.length && !uploading" class="border-y border-line py-14 text-center text-ink-soft">Aucune photo. Ajoutez vos plus belles réalisations.</p>
  <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
    <li v-for="(p, i) in photos" :key="p.id" class="group relative overflow-hidden rounded-xl border border-line bg-sand/40">
      <img :src="p.url" alt="" class="aspect-[4/5] w-full object-cover" />
      <span v-if="i === 0" class="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-0.5 text-[11px] font-semibold text-cream">Aperçu</span>
      <div class="flex items-center justify-between border-t border-line bg-cream px-2 py-1.5">
        <div class="flex gap-1">
          <button type="button" class="rounded-full p-1.5 text-ink-soft hover:bg-ink/5 disabled:opacity-30" :disabled="i === 0" aria-label="Avancer" @click="move(i, -1)"><ArrowUp class="size-4" /></button>
          <button type="button" class="rounded-full p-1.5 text-ink-soft hover:bg-ink/5 disabled:opacity-30" :disabled="i === photos.length - 1" aria-label="Reculer" @click="move(i, 1)"><ArrowDown class="size-4" /></button>
        </div>
        <button type="button" class="rounded-full p-1.5 text-ink-soft hover:bg-terracotta/10 hover:text-terracotta" aria-label="Supprimer la photo" @click="remove(p)"><Trash class="size-4" /></button>
      </div>
    </li>
    <li v-for="n in uploading" :key="`u${n}`" class="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-line">
      <span class="size-6 animate-spin rounded-full border-2 border-copper border-r-transparent" />
    </li>
  </ul>
</template>
