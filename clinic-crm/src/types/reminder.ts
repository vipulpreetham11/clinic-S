import type { Patient, Appointment } from './index'

export type ReminderTriggerType = 'appointment_upcoming' | 'appointment_followup' | 'custom'
export type ReminderChannel = 'whatsapp' | 'sms' | 'email'
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'cancelled'

export interface ReminderRule {
  id: string
  clinic_id: string
  name: string
  trigger_type: ReminderTriggerType
  offset_hours: number
  channel: ReminderChannel[]
  message_template: string
  is_active: boolean
  days_of_week: number[]
  created_at: string
}

export interface ReminderQueue {
  id: string
  clinic_id: string
  appointment_id: string
  patient_id: string
  rule_id: string
  channel: ReminderChannel
  scheduled_at: string
  sent_at: string | null
  status: ReminderStatus
  error_message: string | null
  message_content: string | null
  whatsapp_message_id: string | null
  created_at: string
  // Relations
  patients?: Pick<Patient, 'name' | 'phone' | 'email'>
  appointments?: Pick<Appointment, 'date' | 'start_time'>
  reminder_rules?: Pick<ReminderRule, 'name' | 'channel'>
}

export interface ReminderLog {
  id: string
  reminder_queue_id: string | null
  clinic_id: string
  patient_id: string
  channel: ReminderChannel | null
  message_content: string | null
  status: string | null
  sent_at: string | null
  created_at: string
  // Relations
  patients?: Pick<Patient, 'name' | 'phone'>
}

export interface ReminderFilters {
  status?: ReminderStatus
  channel?: ReminderChannel
  dateFrom?: string
  dateTo?: string
  appointmentId?: string
  patientId?: string
  ruleId?: string
}
