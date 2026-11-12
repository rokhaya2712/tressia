<script setup lang="ts">
import { PLATFORM } from '@tressia/shared'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="bg-ink text-cream">
    <div class="mx-auto max-w-[1440px] px-5 pb-10 pt-16 sm:px-8 lg:px-10 lg:pt-24">
      <div class="grid gap-12 lg:grid-cols-12">
        <div class="lg:col-span-6">
          <p class="font-display text-[clamp(3.5rem,11vw,9rem)] font-light leading-[0.85] tracking-[-0.02em]">Tressia<span class="text-copper">.</span></p>
          <p class="mt-6 max-w-sm text-sm leading-relaxed text-cream/70">Les tresseuses de Mulhouse, Colmar et Strasbourg, chez elles ou à domicile, avec leurs prix et leurs créneaux au même endroit.</p>
        </div>
        <nav class="grid grid-cols-2 gap-8 text-sm lg:col-span-6 lg:grid-cols-3" aria-label="Pied de page">
          <div>
            <p class="eyebrow text-copper">Clientes et clients</p>
            <ul class="mt-4 space-y-1">
              <li><RouterLink to="/tresseuses" class="foot-link">Trouver une tresseuse</RouterLink></li>
              <li><RouterLink to="/mes-rendez-vous" class="foot-link">Mes rendez-vous</RouterLink></li>
              <li><RouterLink to="/connexion" class="foot-link">Connexion</RouterLink></li>
            </ul>
          </div>
          <div>
            <p class="eyebrow text-copper">Tresseuses</p>
            <ul class="mt-4 space-y-1">
              <li><RouterLink to="/devenir-tresseuse" class="foot-link">Devenir tresseuse Tressia</RouterLink></li>
              <li><RouterLink :to="{ name: 'register', query: { pro: '1' } }" class="foot-link">Créer mon profil</RouterLink></li>
              <li><RouterLink to="/pro" class="foot-link">Espace tresseuse</RouterLink></li>
            </ul>
          </div>
          <div class="col-span-2 lg:col-span-1">
            <p class="eyebrow text-copper">Contact</p>
            <address class="mt-4 space-y-1 not-italic text-cream/80">
              <p class="min-h-11 py-2.5">Mulhouse, France</p>
              <a :href="`tel:${PLATFORM.phoneIntl}`" class="foot-link">{{ PLATFORM.phone }}</a>
              <a href="mailto:contact@tressia.fr" class="foot-link">contact@tressia.fr</a>
            </address>
          </div>
        </nav>
      </div>
      <div class="mt-16 flex flex-col gap-3 border-t border-cream/15 pt-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p>© {{ year }} Tressia · Tous droits réservés</p>
          <p class="text-cream/35">Photos : Wikimedia Commons (CC BY-SA 4.0, CC0)</p>
        </div>
        <p class="font-script text-2xl text-copper">Fait en Alsace</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.foot-link { display: inline-flex; min-height: 2.75rem; align-items: center; color: rgb(243 236 227 / 0.8); transition: color 0.3s; }
.foot-link:hover { color: var(--color-cream); }
</style>
