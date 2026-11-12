<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'

const lat = defineModel<number | null>('lat', { required: true })
const lng = defineModel<number | null>('lng', { required: true })
const el = ref<HTMLDivElement>()
let map: L.Map | null = null
let marker: L.Marker | null = null
const icon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#b7793f;border:3px solid #f3ece3;box-shadow:0 2px 8px rgba(23,17,15,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function place(la: number, ln: number) {
  if (!map) return
  if (marker) marker.setLatLng([la, ln])
  else marker = L.marker([la, ln], { icon }).addTo(map)
}
onMounted(() => {
  if (!el.value) return
  const center: L.LatLngTuple = lat.value != null && lng.value != null ? [lat.value, lng.value] : [47.7508, 7.3359]
  map = L.map(el.value, { scrollWheelZoom: false }).setView(center, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map)
  if (lat.value != null && lng.value != null) place(lat.value, lng.value)
  map.on('click', (e: L.LeafletMouseEvent) => {
    lat.value = Number(e.latlng.lat.toFixed(6))
    lng.value = Number(e.latlng.lng.toFixed(6))
  })
  setTimeout(() => map?.invalidateSize(), 50)
})
watch([lat, lng], ([la, ln]) => { if (la != null && ln != null) place(la, ln) })
onBeforeUnmount(() => { map?.remove(); map = null; marker = null })
</script>

<template>
  <div>
    <div ref="el" class="h-72 w-full overflow-hidden rounded-xl border border-line" />
    <p class="mt-1.5 text-[13px] text-ink-soft/80">
      <template v-if="lat != null && lng != null">Position enregistrée ({{ lat.toFixed(4) }}, {{ lng.toFixed(4) }}). Cliquez ailleurs pour la déplacer.</template>
      <template v-else>Cliquez sur la carte pour indiquer votre secteur. Le public ne voit qu’une position approximative.</template>
    </p>
  </div>
</template>
