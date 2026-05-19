import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { generateAvailableSlots } from '@/lib/slotGenerator'
import type { AppointmentStatus } from '@/types'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

export interface ReceptionistTodayStats {
  total_appointments: number
  completed: number
  remaining: number
  checked_in: number
  available_slots: number
  new_patients: number
}

export async function getReceptionistTodayStats(clinicId: string): Promise<ReceptionistTodayStats> {
  const today = todayStr()

  const [
    appointmentsRes,
    checkedInRes,
    newPatientsRes,
    doctorsRes,
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, status')
      .eq('clinic_id', clinicId)
      .eq('date', today),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('date', today)
      .eq('status', 'confirmed'),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),
    supabase
      .from('doctors')
      .select(`
        id, arrival_time, departure_time, slot_duration, working_days,
        breaks:doctor_breaks(start_time, end_time),
        appointments:appointments(start_time, end_time, status, date)
      `)
      .eq('clinic_id', clinicId)
      .eq('is_active', true),
  ])

  if (appointmentsRes.error) throw appointmentsRes.error
  if (checkedInRes.error) throw checkedInRes.error
  if (newPatientsRes.error) throw newPatientsRes.error
  if (doctorsRes.error) throw doctorsRes.error

  const appointments = appointmentsRes.data || []
  const completed = appointments.filter((a) => a.status === 'completed').length
  const terminal = appointments.filter((a) =>
    ['completed', 'cancelled', 'no_show'].includes(a.status)
  ).length
  const remaining = appointments.length - terminal

  const dayName = format(new Date(), 'EEE')
  let availableSlots = 0

  for (const doctor of doctorsRes.data || []) {
    if (!doctor.working_days?.includes(dayName)) continue

    const todayApts = (doctor.appointments || []).filter(
      (a: { date: string; status: string }) =>
        a.date === today && ['pending', 'confirmed', 'rescheduled'].includes(a.status)
    )

    const slots = generateAvailableSlots({
      doctor: {
        arrival_time: doctor.arrival_time,
        departure_time: doctor.departure_time,
        slot_duration: doctor.slot_duration,
        working_days: doctor.working_days,
      },
      breaks: (doctor.breaks || []).map((b: { start_time: string; end_time: string }) => ({
        start_time: b.start_time,
        end_time: b.end_time,
      })),
      existingAppointments: todayApts.map((a: { start_time: string; end_time: string }) => ({
        start_time: a.start_time,
        end_time: a.end_time,
      })),
      blockedDates: [],
      date: today,
    })

    availableSlots += slots.length
  }

  return {
    total_appointments: appointments.length,
    completed,
    remaining,
    checked_in: checkedInRes.count || 0,
    available_slots: availableSlots,
    new_patients: newPatientsRes.count || 0,
  }
}

export async function getReceptionistTodayAppointments(clinicId: string) {
  const today = todayStr()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, date, start_time, end_time, status, source, notes, created_at, updated_at,
      patients(id, name, phone, date_of_birth, is_vip, allergies, blood_group),
      doctors(id, name, specialization, photo_url),
      services(id, name, duration_minutes, price)
    `)
    .eq('clinic_id', clinicId)
    .eq('date', today)
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data || []).map((item: any) => ({
    ...item,
    patient: item.patients ?? null,
    doctor: item.doctors ?? null,
    service: item.services ?? null,
  }))
}

export type DoctorAvailabilityStatus = 'available' | 'with_patient' | 'break' | 'done'

export interface ReceptionistDoctorStatus {
  id: string
  name: string
  specialization: string | null
  photo_url: string | null
  arrival_time: string
  departure_time: string
  isWorkingToday: boolean
  status: DoctorAvailabilityStatus
  nextAppointmentTime: string | null
  remainingAppointments: number
  totalToday: number
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export async function getReceptionistDoctorStatus(
  clinicId: string
): Promise<ReceptionistDoctorStatus[]> {
  const today = todayStr()
  const dayName = format(new Date(), 'EEE')
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select(`
      id, name, specialization, photo_url,
      arrival_time, departure_time, working_days, is_active,
      breaks:doctor_breaks(start_time, end_time),
      appointments:appointments(id, start_time, end_time, status, date)
    `)
    .eq('clinic_id', clinicId)
    .eq('is_active', true)

  if (error) throw error

  return (doctors || []).map((doc) => {
    const isWorkingToday = !!doc.working_days?.includes(dayName)
    const todayApts = (doc.appointments || []).filter(
      (a: { date: string; status: string }) =>
        a.date === today && !['cancelled', 'no_show'].includes(a.status)
    )
    const activeApts = todayApts.filter((a: { status: string }) =>
      ['pending', 'confirmed', 'rescheduled'].includes(a.status)
    )
    const remaining = activeApts.length
    const completedAll =
      todayApts.length > 0 &&
      todayApts.every((a: { status: string }) =>
        ['completed', 'cancelled', 'no_show'].includes(a.status)
      )

    const upcoming = activeApts
      .filter((a: { start_time: string }) => timeToMinutes(a.start_time) >= nowMinutes)
      .sort((a: { start_time: string }, b: { start_time: string }) =>
        a.start_time.localeCompare(b.start_time)
      )

    const currentApt = todayApts.find((a: { status: string; start_time: string; end_time: string }) => {
      if (a.status !== 'confirmed') return false
      const start = timeToMinutes(a.start_time)
      const end = timeToMinutes(a.end_time)
      return nowMinutes >= start && nowMinutes < end
    })

    const onBreak = (doc.breaks || []).some((b: { start_time: string; end_time: string }) => {
      const start = timeToMinutes(b.start_time)
      const end = timeToMinutes(b.end_time)
      return nowMinutes >= start && nowMinutes < end
    })

    let status: DoctorAvailabilityStatus = 'available'

    if (!isWorkingToday || !doc.is_active) {
      status = 'done'
    } else if (nowMinutes >= timeToMinutes(doc.departure_time) || (completedAll && remaining === 0)) {
      status = 'done'
    } else if (currentApt) {
      status = 'with_patient'
    } else if (onBreak) {
      status = 'break'
    }

    return {
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      photo_url: doc.photo_url,
      arrival_time: doc.arrival_time,
      departure_time: doc.departure_time,
      isWorkingToday,
      status,
      nextAppointmentTime: upcoming[0]?.start_time ?? null,
      remainingAppointments: remaining,
      totalToday: todayApts.length,
    }
  }).filter((d) => d.isWorkingToday)
}

export interface ActivityFeedItem {
  id: string
  type: 'check_in' | 'cancelled' | 'new_patient' | 'invoice' | 'booked' | 'completed' | 'no_show'
  message: string
  timestamp: string
}

export async function getReceptionistActivityFeed(clinicId: string): Promise<ActivityFeedItem[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [appointmentsRes, patientsRes, invoicesRes] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id, status, updated_at, created_at, start_time,
        patient:patients(name),
        doctor:doctors(name),
        service:services(name)
      `)
      .eq('clinic_id', clinicId)
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('patients')
      .select('id, name, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('invoices')
      .select('id, total_amount, created_at, appointment_id')
      .eq('clinic_id', clinicId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (appointmentsRes.error) throw appointmentsRes.error
  if (patientsRes.error) throw patientsRes.error

  const items: ActivityFeedItem[] = []

  for (const apt of appointmentsRes.data || []) {
    const patient = (apt.patient as { name?: string } | null)?.name || 'Patient'
    const doctor = (apt.doctor as { name?: string } | null)?.name
    const ts = apt.updated_at || apt.created_at

    if (apt.status === 'confirmed' && apt.updated_at !== apt.created_at) {
      items.push({
        id: `apt-checkin-${apt.id}`,
        type: 'check_in',
        message: `${patient} checked in${doctor ? ` — Dr. ${doctor}` : ''}`,
        timestamp: ts,
      })
    } else if (apt.status === 'cancelled') {
      items.push({
        id: `apt-cancel-${apt.id}`,
        type: 'cancelled',
        message: `Appointment cancelled — ${patient}${doctor ? ` — Dr. ${doctor}` : ''}`,
        timestamp: ts,
      })
    } else if (apt.status === 'completed') {
      items.push({
        id: `apt-done-${apt.id}`,
        type: 'completed',
        message: `${patient} completed visit${doctor ? ` — Dr. ${doctor}` : ''}`,
        timestamp: ts,
      })
    } else if (apt.status === 'no_show') {
      items.push({
        id: `apt-noshow-${apt.id}`,
        type: 'no_show',
        message: `No show — ${patient}`,
        timestamp: ts,
      })
    } else if (apt.created_at === apt.updated_at || !apt.updated_at) {
      items.push({
        id: `apt-booked-${apt.id}`,
        type: 'booked',
        message: `New appointment booked — ${patient}`,
        timestamp: apt.created_at,
      })
    }
  }

  for (const p of patientsRes.data || []) {
    items.push({
      id: `patient-${p.id}`,
      type: 'new_patient',
      message: `New patient registered — ${p.name}`,
      timestamp: p.created_at,
    })
  }

  if (!invoicesRes.error) {
    for (const inv of invoicesRes.data || []) {
      const aptRef = inv.appointment_id
        ? `Apt #${String(inv.appointment_id).slice(0, 4).toUpperCase()}`
        : ''
      items.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        message: `Invoice generated — ₹${inv.total_amount ?? 0}${aptRef ? ` — ${aptRef}` : ''}`,
        timestamp: inv.created_at,
      })
    }
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
}

export function isAppointmentOverdue(
  startTime: string,
  status: AppointmentStatus,
  date: string
): boolean {
  if (date !== todayStr()) return false
  if (!['pending', 'rescheduled'].includes(status)) return false
  const now = new Date()
  const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  return startTime < current
}
