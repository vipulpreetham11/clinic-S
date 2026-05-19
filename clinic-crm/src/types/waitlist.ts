import type { Patient, Doctor, Service, Appointment } from './index'

export type WaitlistPriority = 0 | 1 | 2
export type WaitlistStatus = 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled'
export type NotificationStatus = 'pending' | 'sent' | 'expired'

export interface WaitlistEntry {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string | null
  service_id: string | null
  preferred_date: string | null
  preferred_time_start: string | null
  preferred_time_end: string | null
  notes: string | null
  priority: WaitlistPriority
  status: WaitlistStatus
  notified_at: string | null
  notified_channel: string | null
  booked_appointment_id: string | null
  expires_at: string | null
  position: number
  created_at: string
  // Relations
  patients?: Pick<Patient, 'name' | 'phone' | 'email'>
  doctors?: Pick<Doctor, 'name'>
  services?: Pick<Service, 'name'>
  appointments?: Pick<Appointment, 'date' | 'start_time'>
}

export interface WaitlistNotification {
  id: string
  waitlist_id: string
  clinic_id: string
  available_appointment_slot: string | null
  doctor_id: string | null
  status: NotificationStatus
  created_at: string
  // Relations
  waitlist?: WaitlistEntry
  doctors?: Pick<Doctor, 'name'>
}
