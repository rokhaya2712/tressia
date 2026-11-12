<script setup lang="ts">
import { acceptsAtHer, acceptsHome, formatEuro, type SalonCardDto } from '@tressia/shared'
import { Car, Home, Star } from '@lucide/vue'

defineProps<{ salon: SalonCardDto; index?: number }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'salon', params: { slug: salon.slug } }"
    class="group block rounded-[var(--radius-card)] focus-visible:outline-offset-4"
  >
    <div class="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-sand">
      <img
        v-if="salon.coverUrl"
        :src="salon.coverUrl"
        :alt="`Coiffure réalisée par ${salon.name}`"
        loading="lazy"
        class="size-full object-cover transition-transform duration-700 ease-[var(--ease-editorial)] group-hover:scale-[1.04]"
      />
      <div v-else class="grid size-full place-items-center font-display text-6xl italic text-ink/30">{{ salon.name.charAt(0) }}</div>
      <span v-if="salon.distanceKm != null" class="absolute left-4 top-4 rounded-full bg-cream/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">
        à {{ salon.distanceKm < 1 ? `${Math.round(salon.distanceKm * 1000)} m` : `${salon.distanceKm.toFixed(1).replace('.', ',')} km` }}
      </span>
      <span v-if="index != null" class="absolute bottom-4 right-5 font-display text-2xl italic text-cream/90 drop-shadow">{{ String(index + 1).padStart(2, '0') }}</span>
    </div>
    <div class="mt-4 flex items-start justify-between gap-4 border-t border-line pt-3">
      <div class="min-w-0">
        <p class="eyebrow text-copper">{{ salon.neighborhood }}, {{ salon.city }}</p>
        <h3 class="mt-1 truncate font-display text-[1.7rem] leading-tight text-ink transition-colors group-hover:text-terracotta">{{ salon.name }}</h3>
        <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-soft">
          <span v-if="acceptsAtHer(salon.serviceMode)" class="inline-flex items-center gap-1"><Home class="size-3.5" aria-hidden="true" />Chez elle</span>
          <span v-if="acceptsHome(salon.serviceMode)" class="inline-flex items-center gap-1"><Car class="size-3.5" aria-hidden="true" />À domicile{{ salon.travelFeeEur ? ` +${formatEuro(salon.travelFeeEur)}` : '' }}</span>
        </p>
      </div>
      <div class="shrink-0 text-right text-sm">
        <p v-if="salon.rating != null" class="flex items-center justify-end gap-1 font-semibold text-ink">
          <Star class="size-3.5 fill-copper text-copper" aria-hidden="true" />{{ salon.rating.toFixed(1).replace('.', ',') }}
          <span class="font-normal text-ink-soft/70">({{ salon.reviewCount }})</span>
        </p>
        <p v-else class="text-ink-soft/70">Nouveau</p>
        <p v-if="salon.minPriceEur != null" class="mt-0.5 text-ink-soft">dès {{ formatEuro(salon.minPriceEur) }}</p>
      </div>
    </div>
  </RouterLink>
</template>
