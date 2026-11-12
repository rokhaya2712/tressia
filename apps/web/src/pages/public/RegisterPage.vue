<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthForm from '@/components/public/auth/AuthForm.vue'
import AuthSplit from '@/components/public/auth/AuthSplit.vue'
import { useAuthRedirect } from '@/composables/useAuthRedirect'

const route = useRoute()
const go = useAuthRedirect()
const pro = computed(() => route.query.pro === '1')
const loginTo = computed(() => ({ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }))
</script>

<template>
  <AuthSplit
    :eyebrow="pro ? 'Espace tresseuse' : 'Bienvenue'"
    :title="pro ? 'Devenir tresseuse Tressia' : 'Créer un compte'"
    :quote="pro ? 'Vos coiffures, vos communes, votre agenda. Les clientes réservent pendant que vous tressez.' : 'Réservez en trois gestes, retrouvez tous vos rendez-vous au même endroit.'"
  >
    <p v-if="pro" class="-mt-4 mb-6 text-ink-soft">Créez d’abord votre compte, vous décrirez vos coiffures et l’endroit où vous travaillez juste après.</p>
    <AuthForm mode="register" :role="pro ? 'owner' : 'client'" @done="(u, r) => go(u, r)" />
    <template #footer>
      Déjà inscrit ?
      <RouterLink :to="loginTo" class="inline-flex min-h-11 items-center font-semibold text-terracotta underline underline-offset-4">Se connecter</RouterLink>
      <template v-if="!pro">
        <span class="mx-2 text-line">/</span>
        <RouterLink :to="{ name: 'register', query: { pro: '1' } }" class="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line underline-offset-4">Vous êtes tresseuse ?</RouterLink>
      </template>
    </template>
  </AuthSplit>
</template>
