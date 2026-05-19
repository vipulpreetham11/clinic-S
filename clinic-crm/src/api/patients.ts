import { supabase } from '@/lib/supabase'
import type { Patient } from '@/types'

export async function getPatients(clinicId: string, search?: string) {
  let query = supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPatientById(id: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) throw error
  return data
}

export async function getPatientByPhone(clinicId: string, phone: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .single()
    
  if (error && error.code !== 'PGRST116') throw error // Ignore no rows error
  return data
}

export async function createPatient(data: Omit<Patient, 'id' | 'created_at'>) {
  const { data: result, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function updatePatient(id: string, data: Partial<Patient>) {
  const { data: result, error } = await supabase
    .from('patients')
    .update(data)
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function getPatientHistory(patientId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, doctor:doctors(name), service:services(name)')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    
  if (error) throw error
  return data
}
