import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@tressia/shared'

declare module 'vue-router' {
  interface RouteMeta { roles?: Role[]; layout?: 'public' | 'pro' | 'admin'; title?: string }
}

const routes: RouteRecordRaw[] = [
  // Public (layout editorial, Lenis actif)
  { path: '/', name: 'home', component: () => import('@/pages/public/HomePage.vue'), meta: { layout: 'public' } },
  { path: '/tresseuses', name: 'search', component: () => import('@/pages/public/SearchPage.vue'), meta: { layout: 'public', title: 'Trouver une tresseuse' } },
  { path: '/tresseuses/:slug', name: 'salon', component: () => import('@/pages/public/SalonPage.vue'), meta: { layout: 'public' } },
  { path: '/tresseuses/:slug/reserver', name: 'booking', component: () => import('@/pages/public/BookingPage.vue'), meta: { layout: 'public', title: 'Réserver' } },
  { path: '/connexion', name: 'login', component: () => import('@/pages/public/LoginPage.vue'), meta: { layout: 'public', title: 'Connexion' } },
  { path: '/inscription', name: 'register', component: () => import('@/pages/public/RegisterPage.vue'), meta: { layout: 'public', title: 'Créer un compte' } },
  { path: '/devenir-tresseuse', name: 'for-salons', component: () => import('@/pages/public/ForSalonsPage.vue'), meta: { layout: 'public', title: 'Devenir tresseuse' } },

  // Compte client
  { path: '/mes-rendez-vous', name: 'my-bookings', component: () => import('@/pages/account/MyBookingsPage.vue'), meta: { layout: 'public', roles: ['client', 'owner', 'admin'], title: 'Mes rendez-vous' } },

  // Espace tresseuse
  { path: '/pro/creer-mon-profil', name: 'pro-onboarding', component: () => import('@/pages/pro/OnboardingPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Créer mon profil' } },
  { path: '/pro', name: 'pro-dashboard', component: () => import('@/pages/pro/DashboardPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Tableau de bord' } },
  { path: '/pro/agenda', name: 'pro-agenda', component: () => import('@/pages/pro/AgendaPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Agenda' } },
  { path: '/pro/catalogue', name: 'pro-services', component: () => import('@/pages/pro/ServicesPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Catalogue' } },
  { path: '/pro/planning', name: 'pro-staff', component: () => import('@/pages/pro/StaffPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Planning' } },
  { path: '/pro/horaires', name: 'pro-hours', component: () => import('@/pages/pro/HoursPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Horaires' } },
  { path: '/pro/galerie', name: 'pro-gallery', component: () => import('@/pages/pro/GalleryPage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Galerie' } },
  { path: '/pro/profil', name: 'pro-profile', component: () => import('@/pages/pro/ProfilePage.vue'), meta: { layout: 'pro', roles: ['owner'], title: 'Mon profil' } },

  // Admin
  { path: '/admin', name: 'admin-salons', component: () => import('@/pages/admin/AdminSalonsPage.vue'), meta: { layout: 'admin', roles: ['admin'], title: 'Tresseuses' } },
  { path: '/admin/utilisateurs', name: 'admin-users', component: () => import('@/pages/admin/AdminUsersPage.vue'), meta: { layout: 'admin', roles: ['admin'], title: 'Utilisateurs' } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/public/NotFoundPage.vue'), meta: { layout: 'public', title: 'Page introuvable' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => {
    if (saved) return saved
    if (to.path === from.path) return false // filtres et etapes : seule la query change, on garde la position
    if (to.hash) return { el: to.hash, top: 96 }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.loaded) await auth.fetchMe()
  const roles = to.meta.roles
  if (roles) {
    if (!auth.user) return { name: 'login', query: { redirect: to.fullPath } }
    if (!roles.includes(auth.user.role)) return { name: 'home' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Tressia` : 'Tressia · Tresseuses en Alsace, chez elles ou à domicile'
})
