import { supabase } from '@/lib/supabase'
import type { AppointmentStatus, AppointmentSource } from '@/types'

export type { AppointmentStatus, AppointmentSource }

export interface AppointmentFilters {
  clinicId: string
  date?: string
  dateFrom?: string
  dateTo?: string
  doctorId?: string
  patientId?: string
  status?: AppointmentStatus
  source?: AppointmentSource
  search?: string
  page?: number
  limit?: number
}

export interface CreateAppointmentInput {
  clinic_id: string
  doctor_id: string
  patient_id: string
  service_id: string
  date: string
  start_time: string
  end_time: string
  status?: string
  source: AppointmentSource
  notes?: string
  booked_by: string
}

export async function getAppointments(filters: AppointmentFilters) {
  let query = supabase
    .from('appointments')
    .select(
      `*,
      patients(id, name, phone, is_vip, allergies, blood_group),
      doctors(id, name, specialization, photo_url),
      services(id, name, duration_minutes, price),
      booked_by_user:users!booked_by(id, name, role)`,
      { count: 'exact' }
    )
    .eq('clinic_id', filters.clinicId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (filters.date) query = query.eq('date', filters.date)
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('date', filters.dateTo)
  if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId)
  if (filters.patientId) query = query.eq('patient_id', filters.patientId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.source) query = query.eq('source', filters.source)

  const page = filters.page || 1
  const limit = filters.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  const normalized = (data || []).map((item: any) => ({
    ...item,
    patient: item.patients ?? null,
    doctor: item.doctors ?? null,
    service: item.services ?? null,
  }))
  return { data: normalized, count: count || 0 }
}

export async function getAppointmentById(id: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `*,
      patient:patients(*),
      doctor:doctors(*, doctor_breaks(*)),
      service:services(*),
      booked_by_user:users!booked_by(id, name, role)`
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getBookedSlots(doctorId: string, date: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .in('status', ['pending', 'confirmed', 'rescheduled'])

  if (error) throw error
  return (data || []) as { start_time: string; end_time: string }[]
}

export async function createAppointment(input: CreateAppointmentInput) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(input)
    .select(
      `*,
      patient:patients(name, phone),
      doctor:doctors(name),
      service:services(name, duration_minutes)`
    )
    .single()

  if (error) {
    console.error('[createAppointment] insert error:', error)
    throw error
  }
  return data
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  extra?: {
    cancellationReason?: string
    followUpDate?: string
    followUpNotes?: string
  }
) {
  const updateData: Record<string, unknown> = { status }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }
  if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
    if (extra?.cancellationReason) {
      updateData.cancellation_reason = extra.cancellationReason
    }
  }
  if (extra?.followUpDate) updateData.follow_up_date = extra.followUpDate
  if (extra?.followUpNotes) updateData.follow_up_notes = extra.followUpNotes

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rescheduleAppointment(
  id: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
) {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      date: newDate,
      start_time: newStartTime,
      end_time: newEndTime,
      status: 'rescheduled',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAppointmentNotes(id: string, notes: string) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ notes })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAppointmentStats(
  clinicId: string,
  dateFrom: string,
  dateTo: string
) {
  const { data, error } = await supabase
    .from('appointments')
    .select('status')
    .eq('clinic_id', clinicId)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error) throw error

  const all = data || []
  return {
    total: all.length,
    pending: all.filter((a) => a.status === 'pending').length,
    confirmed: all.filter((a) => a.status === 'confirmed').length,
    completed: all.filter((a) => a.status === 'completed').length,
    cancelled: all.filter((a) => a.status === 'cancelled').length,
    no_show: all.filter((a) => a.status === 'no_show').length,
    rescheduled: all.filter((a) => a.status === 'rescheduled').length,
  }
}

export async function getDoctorForUser(userId: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data?.id || null
}

export async function getDoctorLeaves(doctorId: string) {
  const { data, error } = await supabase
    .from('doctor_leaves')
    .select('from_date, to_date')
    .eq('doctor_id', doctorId)

  if (error) return []
  return data || []
}

export async function getBlockedDatesForDoctor(doctorId: string, clinicId: string) {
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('date')
    .or(`doctor_id.eq.${doctorId},and(doctor_id.is.null,clinic_id.eq.${clinicId})`)

  if (error) return []
  return data || []
}

export async function getDoctorsForService(serviceId: string) {
  const { data, error } = await supabase
    .from('doctor_services')
    .select('doctor_id, doctor:doctors(id, name, specialization, photo_url, working_days, is_active, arrival_time, departure_time, slot_duration)')
    .eq('service_id', serviceId)

  if (error) return []

  const doctors = (data || []).map((row: any) => row.doctor).filter((d: any) => d != null)
  return doctors as any[]
}
