<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AUDIENCE_LABELS, AUDIENCES, CATEGORIES, CITIES, TRAVEL_AREAS, type CategoryDto, type SalonSearchResultDto } from '@tressia/shared'
import { Car, Home, List, LocateFixed, Map as MapIcon, Search, SlidersHorizontal, X } from '@lucide/vue'
import { publicApi, type CityDto } from '@/api/public'
import { inputClass } from '@/components/ui/fields'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import SalonCard from '@/components/public/search/SalonCard.vue'
import SalonMap from '@/components/public/search/SalonMap.vue'
import { localDay } from '@/composables/format'

const route = useRoute()
const router = useRouter()

const categories = ref<CategoryDto[]>(CATEGORIES.map((c, i) => ({ id: i + 1, slug: c.slug, label: c.label })))
const cities = ref<CityDto[]>(Object.entries(CITIES).map(([city, neighborhoods]) => ({ city, neighborhoods })))

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const f = reactive({
  q: '', mode: '', city: '', neighborhood: '', category: '', audience: '', maxPrice: '', date: '', lat: '', lng: '', page: 1,
})
function fromQuery() {
  const q = route.query
  f.q = str(q.q); f.mode = str(q.mode); f.city = str(q.city); f.neighborhood = str(q.neighborhood); f.category = str(q.category)
  f.audience = str(q.audience); f.maxPrice = str(q.maxPrice); f.date = str(q.date); f.lat = str(q.lat); f.lng = str(q.lng)
  f.page = Math.max(1, Number(q.page) || 1)
}
fromQuery()

const view = ref<'list' | 'map'>(str(route.query.vue) === 'carte' ? 'map' : 'list')
const drawer = ref(false)
const result = ref<SalonSearchResultDto | null>(null)
const loading = ref(false)
const error = ref('')
const geoError = ref('')
const locating = ref(false)
const qInput = ref(f.q)

const neighborhoods = computed(() => cities.value.find((c) => c.city === f.city)?.neighborhoods ?? [])
const pageCount = computed(() => (result.value ? Math.max(1, Math.ceil(result.value.total / result.value.pageSize)) : 1))
const today = localDay(0)
const tomorrow = localDay(1)
const activeCount = computed(() => [f.mode, f.city, f.neighborhood, f.audience, f.maxPrice, f.date, f.lat].filter(Boolean).length)

function push(patch: Partial<typeof f> = {}, resetPage = true) {
  Object.assign(f, patch)
  if (resetPage && !('page' in patch)) f.page = 1
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(f)) if (v !== '' && !(k === 'page' && v === 1)) query[k] = String(v)
  if (view.value === 'map') query.vue = 'carte'
  router.replace({ query })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    result.value = await publicApi.searchSalons({
      q: f.q, mode: f.mode, city: f.city, neighborhood: f.neighborhood, category: f.category, audience: f.audience,
      maxPrice: f.maxPrice, date: f.date, lat: f.lat, lng: f.lng, radiusKm: f.lat ? 10 : undefined, page: f.page,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

watch(() => route.query, () => { fromQuery(); qInput.value = f.q; load() })
onMounted(async () => {
  load()
  publicApi.categories().then((c) => { if (c.length) categories.value = c }).catch(() => {})
  publicApi.cities().then((c) => { if (c.length) cities.value = c }).catch(() => {})
})

function submitQ() { push({ q: qInput.value.trim() }) }
function setView(v: 'list' | 'map') { view.value = v; push({}, false) }
function goPage(p: number) { push({ page: p }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
function reset() { qInput.value = ''; push({ q: '', mode: '', city: '', neighborhood: '', category: '', audience: '', maxPrice: '', date: '', lat: '', lng: '' }) }

function aroundMe() {
  if (f.lat) return push({ lat: '', lng: '' })
  geoError.value = ''
  if (!('geolocation' in navigator)) { geoError.value = 'La géolocalisation n’est pas disponible sur cet appareil.'; return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => { locating.value = false; push({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }) },
    () => { locating.value = false; geoError.value = 'Position introuvable. Autorisez la localisation ou choisissez un quartier.' },
    { timeout: 10000, maximumAge: 300000 },
  )
}

const points = computed(() =>
  (result.value?.items ?? [])
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, label: s.name, sub: s.neighborhood, href: router.resolve({ name: 'salon', params: { slug: s.slug } }).href })),
)
const dateMode = computed(() => (!f.date ? '' : f.date === today ? 'today' : f.date === tomorrow ? 'tomorrow' : 'other'))
</script>

<template>
  <div class="grain min-h-screen bg-cream pb-24 pt-24 md:pt-28">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <!-- En-tête -->
      <header class="border-b border-line pb-8">
        <p class="eyebrow text-copper">Mulhouse, Colmar, Strasbourg</p>
        <h1 class="mt-3 font-display text-5xl leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
          Trouver <em class="text-terracotta">sa</em> tresseuse
        </h1>
        <form class="mt-8 flex gap-2" role="search" @submit.prevent="submitQ">
          <label class="relative flex-1">
            <span class="sr-only">Rechercher une tresseuse ou une coiffure</span>
            <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft/60" aria-hidden="true" />
            <input v-model="qInput" type="search" placeholder="Knotless, fulani, vanilles, prénom..." :class="[inputClass, 'h-12 rounded-full pl-11']" />
          </label>
          <UiButton type="submit" variant="ink" class="h-12">Chercher</UiButton>
        </form>

        <!-- Catégories -->
        <div class="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" data-lenis-prevent>
          <div class="flex w-max gap-2" role="group" aria-label="Catégories">
            <button
              type="button"
              class="h-11 rounded-full border px-5 text-sm font-semibold transition"
              :class="!f.category ? 'border-ink bg-ink text-cream' : 'border-line text-ink-soft hover:border-ink'"
              :aria-pressed="!f.category"
              @click="push({ category: '' })"
            >Tout</button>
            <button
              v-for="c in categories"
              :key="c.slug"
              type="button"
              class="h-11 whitespace-nowrap rounded-full border px-5 text-sm font-semibold transition"
              :class="f.category === c.slug ? 'border-ink bg-ink text-cream' : 'border-line text-ink-soft hover:border-ink'"
              :aria-pressed="f.category === c.slug"
              @click="push({ category: f.category === c.slug ? '' : c.slug })"
            >{{ c.label }}</button>
          </div>
        </div>
      </header>

      <div class="mt-8 lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
        <!-- Filtres : tiroir mobile, colonne desktop -->
        <div
          v-if="drawer"
          class="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-hidden="true"
          @click="drawer = false"
        />
        <aside
          class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-card)] bg-cream p-6 shadow-2xl transition-transform duration-500 ease-[var(--ease-editorial)] lg:static lg:z-auto lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
          :class="drawer ? 'translate-y-0' : 'translate-y-full'"
          aria-label="Filtres"
          data-lenis-prevent
        >
          <div class="mb-6 flex items-center justify-between lg:hidden">
            <p class="font-display text-3xl">Affiner</p>
            <button type="button" class="grid size-11 place-items-center rounded-full border border-line" aria-label="Fermer les filtres" @click="drawer = false"><X class="size-5" /></button>
          </div>
          <div class="space-y-6">
            <div>
              <p class="eyebrow mb-3 text-ink-soft">Où se faire coiffer</p>
              <div class="mb-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Lieu">
                <button type="button" role="radio" class="h-11 rounded-full border text-sm font-semibold" :class="!f.mode ? 'border-ink bg-ink text-cream' : 'border-line'" :aria-checked="!f.mode" @click="push({ mode: '' })">Partout</button>
                <button type="button" role="radio" class="flex h-11 items-center justify-center gap-1 whitespace-nowrap rounded-full border text-[13px] font-semibold" :class="f.mode === 'chez_tresseuse' ? 'border-ink bg-ink text-cream' : 'border-line'" :aria-checked="f.mode === 'chez_tresseuse'" @click="push({ mode: 'chez_tresseuse', city: '', neighborhood: '' })"><Home class="size-4" aria-hidden="true" />Chez elle</button>
                <button type="button" role="radio" class="flex h-11 items-center justify-center gap-1 whitespace-nowrap rounded-full border text-[13px] font-semibold" :class="f.mode === 'domicile' ? 'border-ink bg-ink text-cream' : 'border-line'" :aria-checked="f.mode === 'domicile'" @click="push({ mode: 'domicile', city: '', neighborhood: '' })"><Car class="size-4" aria-hidden="true" />Chez moi</button>
              </div>
              <button
                type="button"
                class="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-semibold transition"
                :class="f.lat ? 'border-sage bg-sage text-cream' : 'border-ink/70 text-ink hover:bg-ink hover:text-cream'"
                :aria-pressed="!!f.lat"
                @click="aroundMe"
              >
                <LocateFixed class="size-4" aria-hidden="true" />
                {{ locating ? 'Localisation...' : f.lat ? 'Autour de moi (actif)' : 'Autour de moi' }}
              </button>
              <p v-if="geoError" class="mb-3 text-[13px] text-terracotta" role="alert">{{ geoError }}</p>
              <UiField v-if="f.mode === 'domicile'" label="Ma commune" hint="Les tresseuses qui se déplacent jusqu’à chez vous.">
                <select :value="f.city" :class="inputClass" @change="push({ city: ($event.target as HTMLSelectElement).value })">
                  <option value="">Toutes les communes</option>
                  <optgroup v-for="(communes, area) in TRAVEL_AREAS" :key="area" :label="String(area)">
                    <option v-for="c in communes" :key="c" :value="c">{{ c }}</option>
                  </optgroup>
                </select>
              </UiField>
              <div v-else class="space-y-3">
                <UiField label="Ville">
                  <select :value="f.city" :class="inputClass" @change="push({ city: ($event.target as HTMLSelectElement).value, neighborhood: '' })">
                    <option value="">Toutes les villes</option>
                    <option v-for="c in cities" :key="c.city" :value="c.city">{{ c.city }}</option>
                  </select>
                </UiField>
                <UiField label="Quartier">
                  <select :value="f.neighborhood" :disabled="!f.city" :class="[inputClass, 'disabled:opacity-50']" @change="push({ neighborhood: ($event.target as HTMLSelectElement).value })">
                    <option value="">{{ f.city ? 'Tous les quartiers' : 'Choisissez une ville' }}</option>
                    <option v-for="n in neighborhoods" :key="n" :value="n">{{ n }}</option>
                  </select>
                </UiField>
              </div>
            </div>
            <div class="border-t border-line pt-6">
              <p class="eyebrow mb-3 text-ink-soft">Pour qui</p>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" class="h-11 rounded-full border text-sm font-semibold" :class="!f.audience ? 'border-ink bg-ink text-cream' : 'border-line'" :aria-pressed="!f.audience" @click="push({ audience: '' })">Tous</button>
                <button
                  v-for="a in AUDIENCES" :key="a" type="button" class="h-11 rounded-full border text-sm font-semibold"
                  :class="f.audience === a ? 'border-ink bg-ink text-cream' : 'border-line'" :aria-pressed="f.audience === a"
                  @click="push({ audience: a })"
                >{{ AUDIENCE_LABELS[a] }}</button>
              </div>
            </div>
            <div class="border-t border-line pt-6">
              <UiField label="Budget maximum (€)">
                <input :value="f.maxPrice" type="number" min="0" step="5" inputmode="numeric" placeholder="Ex. 100" :class="inputClass" @change="push({ maxPrice: ($event.target as HTMLInputElement).value })" />
              </UiField>
            </div>
            <div class="border-t border-line pt-6">
              <p class="eyebrow mb-3 text-ink-soft">Disponible le</p>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" class="h-11 rounded-full border text-sm font-semibold" :class="dateMode === 'today' ? 'border-ink bg-ink text-cream' : 'border-line'" @click="push({ date: dateMode === 'today' ? '' : today })">Aujourd’hui</button>
                <button type="button" class="h-11 rounded-full border text-sm font-semibold" :class="dateMode === 'tomorrow' ? 'border-ink bg-ink text-cream' : 'border-line'" @click="push({ date: dateMode === 'tomorrow' ? '' : tomorrow })">Demain</button>
                <label class="relative">
                  <span class="sr-only">Choisir une date</span>
                  <input type="date" :min="today" :value="dateMode === 'other' ? f.date : ''" class="h-11 w-full rounded-full border px-2 text-xs" :class="dateMode === 'other' ? 'border-ink bg-ink text-cream' : 'border-line bg-transparent'" @change="push({ date: ($event.target as HTMLInputElement).value })" />
                </label>
              </div>
            </div>
            <div class="flex gap-2 border-t border-line pt-6">
              <UiButton variant="ghost" size="sm" @click="reset">Tout effacer</UiButton>
              <UiButton variant="ink" class="flex-1 lg:hidden" @click="drawer = false">Voir {{ result?.total ?? '' }} tresseuses</UiButton>
            </div>
          </div>
        </aside>

        <!-- Résultats -->
        <section aria-live="polite" :aria-busy="loading">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-ink-soft">
              <template v-if="result">
                <span class="font-display text-2xl text-ink">{{ result.total }}</span>
                {{ result.total > 1 ? 'tresseuses trouvées' : 'tresseuse trouvée' }}
              </template>
              <template v-else>&nbsp;</template>
            </p>
            <div class="flex items-center gap-2">
              <button type="button" class="flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold lg:hidden" @click="drawer = true">
                <SlidersHorizontal class="size-4" aria-hidden="true" />Filtres<span v-if="activeCount" class="grid size-5 place-items-center rounded-full bg-terracotta text-[11px] text-cream">{{ activeCount }}</span>
              </button>
              <div class="flex rounded-full border border-line p-1" role="group" aria-label="Affichage">
                <button type="button" class="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold" :class="view === 'list' ? 'bg-ink text-cream' : 'text-ink-soft'" :aria-pressed="view === 'list'" @click="setView('list')"><List class="size-4" aria-hidden="true" />Liste</button>
                <button type="button" class="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold" :class="view === 'map' ? 'bg-ink text-cream' : 'text-ink-soft'" :aria-pressed="view === 'map'" @click="setView('map')"><MapIcon class="size-4" aria-hidden="true" />Carte</button>
              </div>
            </div>
          </div>

          <!-- Chargement -->
          <div v-if="loading && !result" class="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
            <div v-for="i in 6" :key="i" class="animate-pulse">
              <div class="aspect-[4/5] rounded-[var(--radius-card)] bg-sand" />
              <div class="mt-4 h-3 w-1/3 rounded bg-sand" /><div class="mt-3 h-6 w-2/3 rounded bg-sand" />
            </div>
          </div>

          <!-- Erreur -->
          <div v-else-if="error" class="mt-10 rounded-[var(--radius-card)] border border-line p-8 text-center sm:p-12">
            <p class="font-display text-3xl">La recherche n’a pas abouti.</p>
            <p class="mt-2 text-ink-soft">{{ error }}</p>
            <UiButton class="mt-6" variant="outline" @click="load">Réessayer</UiButton>
          </div>

          <!-- Vide -->
          <div v-else-if="result && !result.items.length" class="mt-10 rounded-[var(--radius-card)] bg-sand/60 p-8 text-center sm:p-14">
            <p class="eyebrow text-copper">Aucun résultat</p>
            <p class="mt-3 font-display text-3xl sm:text-4xl">Personne ne correspond, pour l’instant.</p>
            <p class="mx-auto mt-3 max-w-md text-ink-soft">Élargissez le quartier, retirez une date ou augmentez le budget : de nouvelles tresseuses d’Alsace rejoignent Tressia chaque semaine.</p>
            <UiButton class="mt-6" variant="ink" @click="reset">Effacer les filtres</UiButton>
          </div>

          <template v-else-if="result">
            <div v-if="view === 'map'" class="mt-6 h-[65vh] min-h-[380px] overflow-hidden rounded-[var(--radius-card)] border border-line">
              <SalonMap :points="points" @select="() => {}" />
            </div>
            <div v-else class="mt-8 grid gap-x-8 gap-y-12 transition-opacity sm:grid-cols-2 xl:grid-cols-3" :class="loading && 'opacity-50'">
              <SalonCard v-for="(s, i) in result.items" :key="s.id" :salon="s" :index="(f.page - 1) * result.pageSize + i" />
            </div>

            <nav v-if="pageCount > 1" class="mt-14 flex items-center justify-center gap-2 border-t border-line pt-8" aria-label="Pagination">
              <UiButton variant="outline" size="sm" :disabled="f.page <= 1" @click="goPage(f.page - 1)">Précédent</UiButton>
              <span class="px-4 text-sm text-ink-soft">Page <strong class="text-ink">{{ f.page }}</strong> sur {{ pageCount }}</span>
              <UiButton variant="outline" size="sm" :disabled="f.page >= pageCount" @click="goPage(f.page + 1)">Suivant</UiButton>
            </nav>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>
