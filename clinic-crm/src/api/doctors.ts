import { supabase } from '@/lib/supabase'
import type { Doctor as DoctorBase, DoctorBreak as DoctorBreakBase, DoctorLeave as DoctorLeaveBase, Service, User } from '@/types'

export interface Doctor extends DoctorBase {
  breaks?: DoctorBreak[]
  services?: Service[]
  user?: User | null
}

export interface DoctorBreak extends DoctorBreakBase {}

export interface DoctorLeave extends DoctorLeaveBase {}

export interface CreateDoctorInput {
  clinic_id: string
  name: string
  specialization?: string
  qualification?: string
  phone?: string
  photo_url?: string
  working_days: string[]
  arrival_time: string
  departure_time: string
  slot_duration: number
  max_appointments_per_day: number
  service_ids: string[]
}

export interface DoctorAppointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  patient?: { name?: string | null; phone?: string | null } | null
  service?: { name?: string | null; duration_minutes?: number | null } | null
}

export async function getDoctors(clinicId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, breaks:doctor_breaks(*), doctor_services(service:services(id, name, duration_minutes, price)), user:users(id, name, email, last_login, is_active)')
    .eq('clinic_id', clinicId)
    .order('name', { ascending: true })

  if (error) throw error

  return (
    data?.map((doctor: any) => ({
      ...doctor,
      services: doctor.doctor_services?.map((ds: any) => ds.service) || [],
    })) || []
  )
}

export async function getDoctorById(id: string): Promise<Doctor> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, breaks:doctor_breaks(*), leaves:doctor_leaves(*), doctor_services(service:services(*)), user:users(id, name, email, last_login, is_active)')
    .eq('id', id)
    .single()

  if (error) throw error

  const services = (data as any)?.doctor_services?.map((ds: any) => ds.service) || []
  return { ...(data as Doctor), services }
}

export async function createDoctor(input: CreateDoctorInput) {
  const { service_ids, ...doctorData } = input

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .insert({ ...doctorData, is_active: true })
    .select()
    .single()

  if (doctorError) {
    console.error('[createDoctor] insert error:', doctorError)
    throw doctorError
  }

  if (service_ids && service_ids.length > 0) {
    const { error: svcError } = await supabase.from('doctor_services').insert(
      service_ids.map((serviceId) => ({
        doctor_id: doctor.id,
        service_id: serviceId,
      }))
    )
    if (svcError) {
      console.error('[createDoctor] doctor_services insert error:', svcError)
      // Non-fatal: doctor was saved, services can be assigned later
    }
  }

  // Default lunch break
  await supabase.from('doctor_breaks').insert({
    doctor_id: doctor.id,
    label: 'Lunch Break',
    start_time: '13:00',
    end_time: '14:00',
  })

  return doctor
}

export async function updateDoctor(id: string, input: Partial<CreateDoctorInput>) {
  const { service_ids, ...doctorData } = input

  const { data, error } = await supabase
    .from('doctors')
    .update(doctorData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[updateDoctor] update error:', error)
    throw error
  }

  if (service_ids !== undefined) {
    await supabase.from('doctor_services').delete().eq('doctor_id', id)
    if (service_ids.length > 0) {
      const { error: svcError } = await supabase.from('doctor_services').insert(
        service_ids.map((serviceId) => ({
          doctor_id: id,
          service_id: serviceId,
        }))
      )
      if (svcError) {
        console.error('[updateDoctor] doctor_services insert error:', svcError)
      }
    }
  }

  return data
}

export async function deleteDoctor(id: string) {
  const { error } = await supabase.from('doctors').delete().eq('id', id)
  if (error) throw error
}

export async function toggleDoctorStatus(id: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('doctors')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function addDoctorBreak(break_: Omit<DoctorBreak, 'id'>) {
  const { data, error } = await supabase
    .from('doctor_breaks')
    .insert(break_)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDoctorBreak(id: string, break_: Partial<DoctorBreak>) {
  const { data, error } = await supabase
    .from('doctor_breaks')
    .update(break_)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDoctorBreak(id: string) {
  const { error } = await supabase
    .from('doctor_breaks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addDoctorLeave(leave: Omit<DoctorLeave, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('doctor_leaves')
    .insert(leave)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDoctorLeave(id: string) {
  const { error } = await supabase
    .from('doctor_leaves')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateDoctorLeave(id: string, leave: Partial<DoctorLeave>) {
  const { data, error } = await supabase
    .from('doctor_leaves')
    .update(leave)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDoctorLeaves(doctorId: string, year?: number, month?: number) {
  let query = supabase
    .from('doctor_leaves')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('from_date', { ascending: true })

  if (year && month) {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`
    query = query.gte('from_date', monthStart).lte('to_date', monthEnd)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getDoctorStats(doctorId: string, dateFrom: string, dateTo: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('status, date, start_time')
    .eq('doctor_id', doctorId)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (error) throw error

  return {
    total: data?.length || 0,
    completed: data?.filter((a: any) => a.status === 'completed').length || 0,
    cancelled: data?.filter((a: any) => a.status === 'cancelled').length || 0,
    no_show: data?.filter((a: any) => a.status === 'no_show').length || 0,
    pending: data?.filter((a: any) => ['pending', 'confirmed'].includes(a.status)).length || 0,
  }
}

export async function getDoctorAppointmentsByMonth(doctorId: string, year: number, month: number): Promise<DoctorAppointment[]> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, start_time, end_time, status, patient:patients(name, phone), service:services(name, duration_minutes)')
    .eq('doctor_id', doctorId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('start_time', { ascending: true })

  if (error) throw error

  return (
    data?.map((appt: any) => ({
      ...appt,
      patient: Array.isArray(appt.patient) ? appt.patient[0] : appt.patient,
      service: Array.isArray(appt.service) ? appt.service[0] : appt.service,
    })) || []
  )
}

export async function getDoctorAppointmentsByDate(doctorId: string, date: string): Promise<DoctorAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, start_time, end_time, status, patient:patients(name, phone), service:services(name, duration_minutes)')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('start_time', { ascending: true })

  if (error) throw error

  return (
    data?.map((appt: any) => ({
      ...appt,
      patient: Array.isArray(appt.patient) ? appt.patient[0] : appt.patient,
      service: Array.isArray(appt.service) ? appt.service[0] : appt.service,
    })) || []
  )
}

export async function getDoctorAppointmentsInRange(doctorId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, start_time, end_time, status, patient:patients(name, phone), service:services(name)')
    .eq('doctor_id', doctorId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .in('status', ['pending', 'confirmed', 'completed'])
    .order('date', { ascending: true })

  if (error) throw error

  return (
    data?.map((appt: any) => ({
      ...appt,
      patient: Array.isArray(appt.patient) ? appt.patient[0] : appt.patient,
      service: Array.isArray(appt.service) ? appt.service[0] : appt.service,
    })) || []
  )
}

export async function getDoctorAppointmentCount(doctorId: string) {
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)

  if (error) throw error
  return count || 0
}

export async function getBlockedDatesForDoctor(doctorId: string, year?: number, month?: number) {
  let query = supabase
    .from('blocked_dates')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('date', { ascending: true })

  if (year && month) {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`
    query = query.gte('date', monthStart).lte('date', monthEnd)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function addBlockedDate(data: { clinic_id: string; doctor_id: string; date: string; reason?: string }) {
  const { data: result, error } = await supabase
    .from('blocked_dates')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return result
}

export async function deleteBlockedDate(id: string) {
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', id)
  if (error) throw error
}
