<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { SalonCardDto, SalonSearchResultDto } from '@tressia/shared'
import { http } from '@/api/http'
import HomeHero from '@/components/public/home/HomeHero.vue'
import HomeCategories from '@/components/public/home/HomeCategories.vue'
import HomeFeatured from '@/components/public/home/HomeFeatured.vue'
import HomeSteps from '@/components/public/home/HomeSteps.vue'
import HomeMarquee from '@/components/public/home/HomeMarquee.vue'
import HomeForSalons from '@/components/public/home/HomeForSalons.vue'

const salons = ref<SalonCardDto[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    const res = await http.get<SalonSearchResultDto>('/salons?page=1')
    salons.value = (res.items ?? []).slice(0, 4)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <HomeHero :featured="salons[0] ?? null" />
    <HomeCategories />
    <HomeFeatured :salons="salons" :loading="loading" :error="error" />
    <HomeMarquee />
    <HomeSteps />
    <HomeForSalons />
  </div>
</template>
