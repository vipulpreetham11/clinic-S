import { supabase } from '@/lib/supabase'
import type { Clinic } from '@/types'

export async function getClinic(clinicId: string) {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .single()
    
  if (error) throw error
  return data
}

export async function updateClinic(id: string, data: Partial<Clinic>) {
  const { data: result, error } = await supabase
    .from('clinics')
    .update(data)
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function getAllClinics() {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .order('name')
    
  if (error) throw error
  return data
}

export async function createClinic(data: Omit<Clinic, 'id' | 'created_at'>) {
  const { data: result, error } = await supabase
    .from('clinics')
    .insert(data)
    .select()
    .single()
    
  if (error) throw error
  return result
}
