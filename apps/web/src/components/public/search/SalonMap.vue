<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'

export interface MapPoint { id: number; lat: number; lng: number; label: string; sub?: string; href?: string }

const props = withDefaults(defineProps<{ points: MapPoint[]; zoom?: number; interactive?: boolean }>(), { zoom: 13, interactive: true })
const emit = defineEmits<{ select: [id: number] }>()
const el = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let layer: L.LayerGroup | null = null

const icon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#9c3f2a;border:3px solid #f3ece3;box-shadow:0 2px 8px rgba(23,17,15,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  const pts = props.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  for (const p of pts) {
    const m = L.marker([p.lat, p.lng], { icon, title: p.label, keyboard: true })
    m.bindPopup(
      `<strong style="font-family:'Cormorant Garamond',serif;font-size:18px">${escapeHtml(p.label)}</strong>${p.sub ? `<br><span style="font-size:12px">${escapeHtml(p.sub)}</span>` : ''}${p.href ? `<br><a href="${p.href}" style="color:#9c3f2a;font-weight:600">Voir le salon</a>` : ''}`,
    )
    m.on('click', () => emit('select', p.id))
    m.addTo(layer)
  }
  if (pts.length === 1) map.setView([pts[0]!.lat, pts[0]!.lng], props.zoom)
  else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 15 })
}

onMounted(() => {
  if (!el.value) return
  map = L.map(el.value, {
    center: [47.7508, 7.3359],
    zoom: props.zoom,
    scrollWheelZoom: false,
    dragging: props.interactive,
    zoomControl: props.interactive,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)
  layer = L.layerGroup().addTo(map)
  draw()
  setTimeout(() => map?.invalidateSize(), 50)
})
watch(() => props.points, draw, { deep: true })
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<template>
  <div ref="el" class="relative z-0 h-full w-full overflow-hidden" />
</template>
