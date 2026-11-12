import type {
  BookingDto, CategoryDto, ClosureDto, OpeningHourDto, PhotoDto, ProStatsDto, SalonDetailDto, SalonInfoInput,
  ServiceDto, ServiceInput, StaffDto, StaffInput, TimeOffDto,
} from '@tressia/shared'
import { http, qs } from './http'

/** Les reponses de l'API pro sont enveloppees ({ salon }, { services }...) : on les deballe ici. */
export const proApi = {
  getSalon: async () => (await http.get<{ salon: SalonDetailDto }>('/pro/salon')).salon,
  createSalon: async (body: SalonInfoInput) => (await http.post<{ salon: SalonDetailDto }>('/pro/salon', body)).salon,
  updateSalon: async (body: Partial<SalonInfoInput>) => (await http.patch<{ salon: SalonDetailDto }>('/pro/salon', body)).salon,

  getHours: async () => (await http.get<{ hours: OpeningHourDto[] }>('/pro/salon/hours')).hours,
  putHours: async (hours: OpeningHourDto[]) => (await http.put<{ hours: OpeningHourDto[] }>('/pro/salon/hours', { hours })).hours,
  getClosures: async () => (await http.get<{ closures: ClosureDto[] }>('/pro/salon/closures')).closures,
  addClosure: async (body: { startsOn: string; endsOn: string; reason: string | null }) => (await http.post<{ closure: ClosureDto }>('/pro/salon/closures', body)).closure,
  deleteClosure: (id: number) => http.del<{ ok: boolean }>(`/pro/salon/closures/${id}`),

  categories: () => http.get<CategoryDto[]>('/categories'),
  getServices: async () => (await http.get<{ services: ServiceDto[] }>('/pro/services')).services,
  addService: async (body: ServiceInput) => (await http.post<{ service: ServiceDto }>('/pro/services', body)).service,
  updateService: async (id: number, body: Partial<ServiceInput>) => (await http.patch<{ service: ServiceDto }>(`/pro/services/${id}`, body)).service,
  deleteService: (id: number) => http.del<{ ok: boolean; deactivated: boolean }>(`/pro/services/${id}`),

  getStaff: async () => (await http.get<{ staff: StaffDto[] }>('/pro/staff')).staff,
  addStaff: async (body: StaffInput) => (await http.post<{ staff: StaffDto }>('/pro/staff', body)).staff,
  updateStaff: async (id: number, body: Partial<StaffInput>) => (await http.patch<{ staff: StaffDto }>(`/pro/staff/${id}`, body)).staff,
  deleteStaff: (id: number) => http.del<{ ok: boolean; deactivated: boolean }>(`/pro/staff/${id}`),
  getTimeOff: async (staffId: number) => (await http.get<{ timeOff: TimeOffDto[] }>(`/pro/staff/${staffId}/time-off`)).timeOff,
  addTimeOff: async (staffId: number, body: { startsAt: string; endsAt: string; reason: string | null }) =>
    (await http.post<{ timeOff: TimeOffDto }>(`/pro/staff/${staffId}/time-off`, body)).timeOff,
  deleteTimeOff: (staffId: number, offId: number) => http.del<{ ok: boolean }>(`/pro/staff/${staffId}/time-off/${offId}`),

  getGallery: async () => (await http.get<{ photos: PhotoDto[] }>('/pro/gallery')).photos,
  addPhoto: async (url: string) => (await http.post<{ photo: PhotoDto }>('/pro/gallery', { url })).photo,
  deletePhoto: (id: number) => http.del<{ ok: boolean }>(`/pro/gallery/${id}`),
  reorderGallery: async (ids: number[]) => (await http.patch<{ photos: PhotoDto[] }>('/pro/gallery', { ids })).photos,

  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<{ url: string }>('/pro/uploads', fd)
  },

  bookings: async (params: { from: string; to: string; staffId?: number }) => (await http.get<{ bookings: BookingDto[] }>(`/pro/bookings${qs(params)}`)).bookings,
  cancelBooking: async (id: number, reason: string) => (await http.post<{ booking: BookingDto }>(`/pro/bookings/${id}/cancel`, { reason })).booking,
  completeBooking: async (id: number) => (await http.post<{ booking: BookingDto }>(`/pro/bookings/${id}/complete`)).booking,
  noShowBooking: async (id: number) => (await http.post<{ booking: BookingDto }>(`/pro/bookings/${id}/no-show`)).booking,

  stats: () => http.get<ProStatsDto>('/pro/stats'),
}
