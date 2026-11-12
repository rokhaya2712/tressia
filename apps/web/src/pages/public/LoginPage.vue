<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthForm from '@/components/public/auth/AuthForm.vue'
import AuthSplit from '@/components/public/auth/AuthSplit.vue'
import { useAuthRedirect } from '@/composables/useAuthRedirect'

const route = useRoute()
const go = useAuthRedirect()
const registerTo = computed(() => ({ name: 'register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }))
</script>

<template>
  <AuthSplit eyebrow="Bon retour" title="Se connecter" quote="Votre fauteuil vous attend, à l’heure que vous avez choisie.">
    <AuthForm mode="login" @done="(u) => go(u)" />
    <template #footer>
      Pas encore de compte ?
      <RouterLink :to="registerTo" class="inline-flex min-h-11 items-center font-semibold text-terracotta underline underline-offset-4">Créer un compte</RouterLink>
    </template>
  </AuthSplit>
</template>
