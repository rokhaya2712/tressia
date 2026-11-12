<script setup lang="ts">
import { BOOKING_STATUS_LABELS, type BookingStatus } from '@tressia/shared'
defineProps<{ status: BookingStatus }>()
const tone: Record<BookingStatus, string> = {
  confirmed: 'bg-copper/15 text-copper',
  completed: 'bg-sage/15 text-sage',
  no_show: 'bg-terracotta/12 text-terracotta',
  cancelled_by_client: 'bg-terracotta/12 text-terracotta',
  cancelled_by_salon: 'bg-terracotta/12 text-terracotta',
}
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold" :class="tone[status]">{{ BOOKING_STATUS_LABELS[status] }}</span>
</template>
