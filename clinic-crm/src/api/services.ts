import { supabase } from '@/lib/supabase'
import type { Service, ServiceAppointment, ServiceUpsertInput } from '@/types'

export type ServiceStatusFilter = 'all' | 'active' | 'inactive'

export interface GetServicesOptions {
  search?: string
  status?: ServiceStatusFilter
}

export async function getServices(clinicId: string, options: GetServicesOptions = {}) {
  let query = supabase
    .from('services')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('name')

  if (options.status === 'active') {
    query = query.eq('is_active', true)
  } else if (options.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  if (options.search?.trim()) {
    const search = options.search.trim()
    query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Service[]
}

export async function getServiceById(clinicId: string, serviceId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('id', serviceId)
    .single()

  if (error) throw error
  return data as Service
}

export async function upsertService(input: ServiceUpsertInput & { clinic_id: string }) {
  const payload = {
    clinic_id: input.clinic_id,
    name: input.name.trim(),
    category: input.category,
    description: input.description?.trim() ? input.description.trim() : null,
    duration_minutes: input.duration_minutes,
    price: input.price,
    is_active: input.is_active,
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', input.id)
      .eq('clinic_id', input.clinic_id)
      .select()
      .single()

    if (error) throw error
    return data as Service
  }

  const { data, error } = await supabase
    .from('services')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as Service
}

export async function createService(data: Omit<Service, 'id' | 'created_at'>) {
  const { data: result, error } = await supabase
    .from('services')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateService(id: string, data: Partial<Service>) {
  const { data: result, error } = await supabase
    .from('services')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result
}

export async function toggleService(id: string, isActive: boolean, clinicId: string) {
  const { data: result, error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) throw error
  return result
}

export async function deleteService(id: string, clinicId: string) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('clinic_id', clinicId)

  if (error) throw error
}

export async function getServiceUpcomingAppointments(clinicId: string, serviceId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `id, date, start_time, end_time, status,
      patient:patients(id, name, phone),
      doctor:doctors(id, name, specialization)`
    )
    .eq('clinic_id', clinicId)
    .eq('service_id', serviceId)
    .gte('date', today)
    .in('status', ['pending', 'confirmed', 'rescheduled'])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw error

  return (data || []).map((item) => ({
    id: item.id,
    date: item.date,
    start_time: item.start_time,
    end_time: item.end_time,
    status: item.status,
    patient: Array.isArray(item.patient) ? (item.patient[0] ?? null) : item.patient,
    doctor: Array.isArray(item.doctor) ? (item.doctor[0] ?? null) : item.doctor,
  })) as ServiceAppointment[]
}
