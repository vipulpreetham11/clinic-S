export const SERVICE_CATEGORIES = [
  'General',
  'Consultation',
  'Procedure',
  'Lab Test',
  'Package',
  'Other',
] as const

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export interface Service {
  id: string
  clinic_id: string | null
  name: string
  category: ServiceCategory | null
  description: string | null
  duration_minutes: number
  price: number | null
  is_active: boolean
  created_at: string
}

export interface ServiceUpsertInput {
  id?: string
  name: string
  category: ServiceCategory
  description?: string | null
  duration_minutes: number
  price: number
  is_active: boolean
}

export interface ServiceAppointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  patient: { id: string; name: string; phone: string | null } | null
  doctor: { id: string; name: string; specialization: string | null } | null
}
