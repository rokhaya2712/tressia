import type { AvailabilityDto, CategoryDto, ReviewDto, SalonDetailDto, SalonSearchResultDto, StaffTodayDto } from '@tressia/shared'
import { http, qs } from './http'

export interface SearchParams {
  q?: string
  mode?: string
  city?: string
  neighborhood?: string
  category?: string
  audience?: string
  maxPrice?: number | string
  date?: string
  lat?: number | string
  lng?: number | string
  radiusKm?: number | string
  page?: number | string
}

export interface CityDto { city: string; neighborhoods: string[] }

export const publicApi = {
  searchSalons: (p: SearchParams) => http.get<SalonSearchResultDto>(`/salons${qs({ ...p })}`),
  categories: () => http.get<CategoryDto[]>('/categories'),
  cities: () => http.get<CityDto[]>('/cities'),
  salon: (slug: string) => http.get<SalonDetailDto>(`/salons/${encodeURIComponent(slug)}`),
  reviews: (slug: string) => http.get<ReviewDto[]>(`/salons/${encodeURIComponent(slug)}/reviews`),
  staffToday: (slug: string) => http.get<StaffTodayDto[]>(`/salons/${encodeURIComponent(slug)}/staff-today`),
  availability: (slug: string, date: string, serviceIds: number[], staffId?: number | null) =>
    http.get<AvailabilityDto>(
      `/salons/${encodeURIComponent(slug)}/availability${qs({ date, serviceIds: serviceIds.join(','), staffId: staffId ?? undefined })}`,
    ),
}
