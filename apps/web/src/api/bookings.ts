import type { BookingDto, BookingLocation } from '@tressia/shared'
import { http } from './http'

export interface CreateBookingInput {
  salonId: number; serviceIds: number[]; staffId: number | null; startsAt: string; note?: string
  location?: BookingLocation; clientAddress?: string; clientCity?: string
}

export const bookingsApi = {
  create: (input: CreateBookingInput) => http.post<{ booking: BookingDto }>('/bookings', input),
  mine: () => http.get<{ upcoming: BookingDto[]; past: BookingDto[] }>('/me/bookings'),
  cancel: (id: number) => http.post<unknown>(`/me/bookings/${id}/cancel`),
  review: (id: number, rating: number, comment?: string) => http.post<unknown>(`/me/bookings/${id}/review`, { rating, comment }),
}
