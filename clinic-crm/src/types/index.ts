import type { Service } from './service'
export type {
  ReminderRule,
  ReminderQueue,
  ReminderLog,
  ReminderTriggerType,
  ReminderChannel,
} from './reminder'

export type {
  WaitlistEntry,
  WaitlistNotification,
  WaitlistPriority,
  NotificationStatus,
} from './waitlist'

// ============================================
// ClinicOS — TypeScript Types
// Matches Supabase DB schema exactly
// ============================================

export type UserRole = 'super_admin' | 'admin' | 'receptionist' | 'doctor'

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'

export type AppointmentSource = 'admin' | 'whatsapp' | 'website' | 'receptionist'

export type ReminderType = '24hr' | '1hr' | 'custom'

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export type WaitlistStatus = 'waiting' | 'notified' | 'booked' | 'expired' | 'cancelled'

export type ClinicStatus = 'active' | 'inactive' | 'suspended'
export type { ServiceCategory, ServiceUpsertInput, ServiceAppointment } from './service'
export type { Service } from './service'
export type {
  Invoice as RichInvoice,
  InvoiceListItem,
  InvoiceDetails,
  InvoiceLineItem,
  InvoicePaymentMethod,
  InvoiceDiscountType,
  InvoiceStats,
  InvoiceFilters,
  UpsertInvoiceInput,
} from './invoice'

// ---- 1. Clinics ----
export interface Clinic {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website?: string | null
  gstin?: string | null
  default_slot_duration?: number
  currency?: string
  business_hours?: Record<string, { enabled: boolean; open: string; close: string }> | null
  timezone: string
  working_days: string[]
  opening_time: string
  closing_time: string
  status: ClinicStatus
  created_at: string
}

// ---- 2. Users ----
export interface User {
  id: string
  clinic_id: string | null
  name: string
  email: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  doctor_id?: string | null
  last_login?: string | null
  created_at: string
}

export type { ClinicNotificationSettings, ClinicInvoiceSettings, BusinessHoursMap, DayKey } from './settings'

// ---- 3. Doctors ----
export interface Doctor {
  id: string
  clinic_id: string | null
  user_id: string | null
  name: string
  specialization: string | null
  qualification: string | null
  phone: string | null
  photo_url: string | null
  working_days: string[]
  arrival_time: string
  departure_time: string
  slot_duration: number
  max_appointments_per_day: number
  is_active: boolean
  created_at: string
}

// ---- 4. Doctor Breaks ----
export interface DoctorBreak {
  id: string
  doctor_id: string | null
  label: string
  start_time: string
  end_time: string
}

// ---- 5. Doctor Leaves ----
export interface DoctorLeave {
  id: string
  doctor_id: string | null
  clinic_id: string | null
  from_date: string
  to_date: string
  reason?: string | null
  created_at?: string
}

// ---- 6. Doctor Services (junction) ----
export interface DoctorService {
  doctor_id: string
  service_id: string
}

// ---- 7. Patients ----
export interface Patient {
  id: string
  clinic_id: string | null
  name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  notes: string | null
  is_vip: boolean
  allergies?: string | null
  blood_group?: string | null
  medical_history?: string | null
  created_at: string
}

// ---- 8. Appointments ----
export interface Appointment {
  id: string
  clinic_id: string | null
  doctor_id: string | null
  patient_id: string | null
  service_id: string | null
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  source: AppointmentSource
  notes: string | null
  booked_by: string | null
  follow_up_date?: string | null
  follow_up_notes?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  whatsapp_message_id?: string | null
  created_at: string
}

// ---- 9. Reminders ----
export interface Reminder {
  id: string
  appointment_id: string | null
  clinic_id: string | null
  type: ReminderType | null
  channel: string
  scheduled_at: string | null
  sent_at: string | null
  status: ReminderStatus
  created_at: string
}

// ---- 10. Blocked Dates ----
export interface BlockedDate {
  id: string
  clinic_id: string | null
  doctor_id: string | null
  date: string
  reason: string | null
  created_at: string
}

// ---- 11. Waitlist ----
// (Imported from ./waitlist)

// ---- 12. Conversations (WhatsApp) ----
export interface Conversation {
  id: string
  clinic_id: string | null
  patient_phone: string
  patient_name: string | null
  messages: Record<string, unknown>[]
  last_message: string | null
  last_message_at: string | null
  is_ai_active: boolean
  created_at: string
}

// ---- 13. Invoices ----
export interface Invoice {
  id: string
  clinic_id: string | null
  appointment_id: string | null
  total_amount: number | null
  status: InvoiceStatus
  pdf_url: string | null
  created_at: string
}

// ---- 14. Audit Logs ----
export interface AuditLog {
  id: string
  clinic_id: string | null
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

// ---- Joined / Enriched types ----
export interface AppointmentWithDetails extends Appointment {
  patient?: Pick<Patient, 'id' | 'name' | 'phone' | 'is_vip' | 'allergies' | 'blood_group'> | Patient
  doctor?: Pick<Doctor, 'id' | 'name' | 'specialization' | 'photo_url'> | Doctor
  service?: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price'> | Service
  booked_by_user?: Pick<User, 'id' | 'name' | 'role'> | null
}

export interface DoctorWithServices extends Doctor {
  services?: Service[]
  breaks?: DoctorBreak[]
}

// ---- Time Slot type for scheduling ----
export interface TimeSlot {
  start: string
  end: string
  available: boolean
}
