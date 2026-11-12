import type { UserDto } from '@tressia/shared'
import { useRoute, useRouter } from 'vue-router'

/** Destination après connexion ou inscription. */
export function useAuthRedirect() {
  const route = useRoute()
  const router = useRouter()
  return (user: UserDto, justRegistered = false) => {
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : null
    if (redirect) return router.push(redirect)
    if (user.role === 'owner') return router.push(justRegistered ? '/pro/creer-mon-profil' : '/pro')
    if (user.role === 'admin') return router.push('/admin')
    return router.push('/')
  }
}
