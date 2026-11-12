import type { AdminSalonDto, SalonStatus, UserDto } from '@tressia/shared'
import { http, qs } from './http'

export type AdminUserDto = UserDto & { createdAt: string }

export const adminApi = {
  salons: async (status: SalonStatus) => (await http.get<{ salons: AdminSalonDto[] }>(`/admin/salons${qs({ status })}`)).salons,
  publish: async (id: number) => (await http.post<{ salon: AdminSalonDto }>(`/admin/salons/${id}/publish`)).salon,
  suspend: async (id: number) => (await http.post<{ salon: AdminSalonDto }>(`/admin/salons/${id}/suspend`)).salon,
  users: async () => (await http.get<{ users: AdminUserDto[] }>('/admin/users')).users,
}
