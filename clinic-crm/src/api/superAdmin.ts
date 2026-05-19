import { supabase } from '@/lib/supabase'
import type { Clinic, ClinicStatus } from '@/types'

export interface ClinicWithStats {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  status: ClinicStatus
  created_at: string
  total_appointments: number
  appointments_today: number
  total_patients: number
  total_doctors: number
  total_users: number
  last_activity: string | null
}

export interface PlatformStats {
  total_clinics: number
  active_clinics: number
  total_appointments_today: number
  total_appointments_month: number
  total_patients: number
  total_doctors: number
  total_clinic_admins: number
  total_receptionists: number
  new_clinics_this_month: number
}

export interface CreateClinicInput {
  name: string
  slug: string
  primary_color: string
  address?: string
  phone?: string
  whatsapp?: string
  email?: string
  opening_time: string
  closing_time: string
  working_days: string[]
}

export interface CreateClinicAdminInput {
  clinic_id: string
  name: string
  email: string
  password: string
  phone?: string
}

export interface CreateClinicAdminResult {
  success: boolean
  message: string
  userId?: string
}

export async function getAllClinicsWithStats(): Promise<ClinicWithStats[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data: clinics, error } = await supabase
    .from('clinics')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!clinics) return []

  const clinicsWithStats = await Promise.all(
    clinics.map(async (clinic) => {
      const [
        appointmentsResult,
        appointmentsTodayResult,
        patientsResult,
        doctorsResult,
        usersResult,
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)
          .eq('date', today),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id),
        supabase
          .from('doctors')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinic.id)
          .eq('is_active', true),
        supabase
          .from('users')
          .select('id, last_login', { count: 'exact' })
          .eq('clinic_id', clinic.id)
          .not('last_login', 'is', null)
          .order('last_login', { ascending: false })
          .limit(1),
      ])

      return {
        ...clinic,
        status: clinic.status as ClinicStatus,
        total_appointments: appointmentsResult.count ?? 0,
        appointments_today: appointmentsTodayResult.count ?? 0,
        total_patients: patientsResult.count ?? 0,
        total_doctors: doctorsResult.count ?? 0,
        total_users: usersResult.count ?? 0,
        last_activity: (usersResult.data?.[0] as { last_login?: string })?.last_login ?? null,
      }
    })
  )

  return clinicsWithStats
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const [
    clinicsResult,
    activeClinicsResult,
    appointmentsTodayResult,
    appointmentsMonthResult,
    patientsResult,
    doctorsResult,
    newClinicsResult,
    adminsResult,
    receptionistsResult,
  ] = await Promise.all([
    supabase.from('clinics').select('id', { count: 'exact', head: true }),
    supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('date', today),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('date', monthStart),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('clinics').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'receptionist').eq('is_active', true),
  ])

  return {
    total_clinics: clinicsResult.count ?? 0,
    active_clinics: activeClinicsResult.count ?? 0,
    total_appointments_today: appointmentsTodayResult.count ?? 0,
    total_appointments_month: appointmentsMonthResult.count ?? 0,
    total_patients: patientsResult.count ?? 0,
    total_doctors: doctorsResult.count ?? 0,
    total_clinic_admins: adminsResult.count ?? 0,
    total_receptionists: receptionistsResult.count ?? 0,
    new_clinics_this_month: newClinicsResult.count ?? 0,
  }
}

export async function createClinic(input: CreateClinicInput): Promise<Clinic> {
  const { data: existing, error: existingError } = await supabase
    .from('clinics')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) throw new Error('This slug is already taken. Choose another.')

  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .insert({
      ...input,
      address: input.address ?? null,
      phone: input.phone ?? null,
      whatsapp: input.whatsapp ?? null,
      email: input.email ?? null,
      status: 'active' as ClinicStatus,
      timezone: 'Asia/Kolkata',
      logo_url: null,
    })
    .select()
    .single()

  if (clinicError || !clinic) throw new Error(clinicError?.message ?? 'Failed to create clinic')

  const { error: notificationSettingsError } = await supabase
    .from('notification_settings')
    .insert({ clinic_id: clinic.id })

  if (notificationSettingsError) {
    await supabase.from('clinics').delete().eq('id', clinic.id)
    throw new Error(notificationSettingsError.message)
  }

  return clinic as Clinic
}

export async function createClinicAdmin(
  input: CreateClinicAdminInput
): Promise<CreateClinicAdminResult> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
          role: 'admin',
          clinic_id: input.clinic_id,
        },
      },
    })

    if (authError) throw new Error(authError.message)
    if (!authData.user) throw new Error('User creation failed')

    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      clinic_id: input.clinic_id,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      role: 'admin',
      is_active: true,
    })

    if (profileError) throw new Error(profileError.message)

    return {
      success: true,
      message: 'Admin account created successfully',
      userId: authData.user.id,
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create admin account',
    }
  }
}

export async function updateClinicStatus(
  clinicId: string,
  status: ClinicStatus,
  reason?: string
) {
  const { data, error } = await supabase
    .from('clinics')
    .update({ status })
    .eq('id', clinicId)
    .select()
    .single()

  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_logs').insert({
    clinic_id: clinicId,
    user_id: user?.id ?? null,
    action: `clinic_status_changed_to_${status}`,
    entity_type: 'clinic',
    entity_id: clinicId,
    old_value: null,
    new_value: { status, reason: reason ?? null },
  })

  return data
}

export async function deleteClinic(clinicId: string) {
  const { error } = await supabase.from('clinics').delete().eq('id', clinicId)
  if (error) throw error
}

export async function getAppointmentsTrend(
  clinicId?: string
): Promise<{ date: string; count: number }[]> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let query = supabase
    .from('appointments')
    .select('date')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (clinicId) query = query.eq('clinic_id', clinicId)

  const { data, error } = await query
  if (error) throw error

  const grouped: Record<string, number> = {}
  data?.forEach((apt) => {
    grouped[apt.date] = (grouped[apt.date] ?? 0) + 1
  })

  return Object.entries(grouped).map(([date, count]) => ({ date, count }))
}

export async function getClinicWithStats(clinicId: string): Promise<ClinicWithStats> {
  const results = await getAllClinicsWithStats()
  const found = results.find((c) => c.id === clinicId)
  if (!found) throw new Error('Clinic not found')
  return found
}

export async function getClinicUsers(clinicId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClinicDoctors(clinicId: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getClinicPatients(clinicId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClinicRecentAppointments(clinicId: string, limit = 10) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients(id, name, phone),
      doctors(id, name, specialization),
      services(id, name, duration_minutes, price)
    `)
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((item: any) => ({
    ...item,
    patient: item.patients ?? null,
    doctor: item.doctors ?? null,
    service: item.services ?? null,
  }))
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}

export async function updateClinicInfo(
  clinicId: string,
  data: Partial<{
    name: string
    primary_color: string
    address: string
    phone: string
    whatsapp: string
    email: string
    opening_time: string
    closing_time: string
    working_days: string[]
  }>
) {
  const { data: result, error } = await supabase
    .from('clinics')
    .update(data)
    .eq('id', clinicId)
    .select()
    .single()
  if (error) throw error
  return result
}
