export type SettingsUserRole = 'admin' | 'doctor' | 'receptionist'

export const SETTINGS_ROLE_LABELS: Record<SettingsUserRole, string> = {
  admin: 'Clinic Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
}

export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface DayBusinessHours {
  enabled: boolean
  open: string
  close: string
}

export type BusinessHoursMap = Record<DayKey, DayBusinessHours>

export interface ClinicNotificationSettings {
  new_appointment_notify_receptionist: boolean
  appointment_cancelled_notify_doctor: boolean
  reminder_failures_notify_admin: boolean
  whatsapp_delivery_failures_notify_admin: boolean
}

export const DEFAULT_NOTIFICATION_SETTINGS: ClinicNotificationSettings = {
  new_appointment_notify_receptionist: true,
  appointment_cancelled_notify_doctor: true,
  reminder_failures_notify_admin: true,
  whatsapp_delivery_failures_notify_admin: true,
}

export interface ClinicInvoiceSettings {
  clinic_id: string
  prefix: string
  default_tax: number
  footer_text: string | null
  show_gstin: boolean
  payment_terms: string | null
  updated_at?: string
}

export const DEFAULT_INVOICE_SETTINGS: Omit<ClinicInvoiceSettings, 'clinic_id'> = {
  prefix: 'INV',
  default_tax: 18,
  footer_text: 'Thank you for choosing our clinic.',
  show_gstin: true,
  payment_terms: 'Payment due at time of visit unless otherwise agreed.',
}
