<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import ProLayout from '@/layouts/ProLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const route = useRoute()
const layout = computed(() => ({ public: PublicLayout, pro: ProLayout, admin: AdminLayout })[route.meta.layout ?? 'public'])
</script>

<template>
  <component :is="layout">
    <RouterView v-slot="{ Component }">
      <component :is="Component" :key="route.fullPath" />
    </RouterView>
  </component>
</template>
