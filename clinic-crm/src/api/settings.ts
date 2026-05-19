import { supabase } from '@/lib/supabase'
import { invokeCreateUser } from '@/api/createUser'
import type { Clinic } from '@/types'
import type {
  ClinicNotificationSettings,
  ClinicInvoiceSettings,
  SettingsUserRole,
} from '@/types/settings'
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_INVOICE_SETTINGS,
} from '@/types/settings'
import { updateClinic } from '@/api/clinics'

export interface ClinicProfileInput {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  gstin?: string | null
  logo_url?: string | null
  default_slot_duration: number
  currency: string
  business_hours: Record<string, { enabled: boolean; open: string; close: string }>
  working_days: string[]
  opening_time: string
  closing_time: string
}

export async function uploadClinicLogo(clinicId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${clinicId}/logo-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('clinic-logos').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from('clinic-logos').getPublicUrl(path)
  return data.publicUrl
}

export async function updateClinicProfile(clinicId: string, input: ClinicProfileInput) {
  return updateClinic(clinicId, input as Partial<Clinic>)
}

export async function getClinicUsers(clinicId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, doctor_id, created_at')
    .eq('clinic_id', clinicId)
    .neq('role', 'super_admin')
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function getClinicDoctorsForLink(clinicId: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, name, user_id')
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

export interface InviteUserInput {
  clinic_id: string
  email: string
  name: string
  role: SettingsUserRole
  phone?: string
  doctor_id?: string | null
}

export interface InviteClinicUserInput extends InviteUserInput {
  password: string
}

export async function inviteClinicUser(input: InviteClinicUserInput) {
  return invokeCreateUser({
    email: input.email,
    password: input.password,
    name: input.name,
    role: input.role,
    clinic_id: input.clinic_id,
    phone: input.phone,
  })
}

export async function setUserActive(userId: string, isActive: boolean) {
  const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
  if (error) throw error
}

export async function updateUserRole(
  userId: string,
  role: SettingsUserRole,
  doctorId?: string | null
) {
  const { error } = await supabase
    .from('users')
    .update({
      role,
      doctor_id: role === 'doctor' ? doctorId ?? null : null,
    })
    .eq('id', userId)

  if (error) throw error

  if (role === 'doctor' && doctorId) {
    await supabase.from('doctors').update({ user_id: userId }).eq('id', doctorId)
  }
}

export async function getNotificationSettings(
  clinicId: string
): Promise<ClinicNotificationSettings> {
  const { data, error } = await supabase
    .from('clinic_notification_settings')
    .select('settings')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    await supabase.from('clinic_notification_settings').insert({
      clinic_id: clinicId,
      settings: DEFAULT_NOTIFICATION_SETTINGS,
    })
    return { ...DEFAULT_NOTIFICATION_SETTINGS }
  }

  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(data.settings as ClinicNotificationSettings) }
}

export async function saveNotificationSettings(
  clinicId: string,
  settings: ClinicNotificationSettings
) {
  const { data, error } = await supabase
    .from('clinic_notification_settings')
    .upsert(
      { clinic_id: clinicId, settings, updated_at: new Date().toISOString() },
      { onConflict: 'clinic_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data.settings as ClinicNotificationSettings
}

export async function getInvoiceSettings(clinicId: string): Promise<ClinicInvoiceSettings> {
  const { data, error } = await supabase
    .from('clinic_invoice_settings')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    const defaults = { clinic_id: clinicId, ...DEFAULT_INVOICE_SETTINGS }
    await supabase.from('clinic_invoice_settings').insert(defaults)
    return defaults as ClinicInvoiceSettings
  }

  return {
    clinic_id: data.clinic_id,
    prefix: data.prefix ?? DEFAULT_INVOICE_SETTINGS.prefix,
    default_tax: Number(data.default_tax ?? DEFAULT_INVOICE_SETTINGS.default_tax),
    footer_text: data.footer_text ?? DEFAULT_INVOICE_SETTINGS.footer_text,
    show_gstin: data.show_gstin ?? true,
    payment_terms: data.payment_terms ?? DEFAULT_INVOICE_SETTINGS.payment_terms,
    updated_at: data.updated_at,
  }
}

export async function saveInvoiceSettings(
  clinicId: string,
  settings: Omit<ClinicInvoiceSettings, 'clinic_id' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('clinic_invoice_settings')
    .upsert(
      {
        clinic_id: clinicId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clinic_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data as ClinicInvoiceSettings
}

export async function exportClinicData(clinicId: string) {
  const [patientsRes, appointmentsRes, invoicesRes] = await Promise.all([
    supabase.from('patients').select('*').eq('clinic_id', clinicId),
    supabase
      .from('appointments')
      .select(
        `*,
        patient:patients(name),
        doctor:doctors(name),
        service:services(name)`
      )
      .eq('clinic_id', clinicId),
    supabase.from('invoices').select('*').eq('clinic_id', clinicId),
  ])

  if (patientsRes.error) throw patientsRes.error
  if (appointmentsRes.error) throw appointmentsRes.error
  if (invoicesRes.error) throw invoicesRes.error

  return {
    patients: patientsRes.data ?? [],
    appointments: appointmentsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
  }
}

export async function resetDemoClinicData(clinicId: string) {
  await supabase.from('invoices').delete().eq('clinic_id', clinicId)
  await supabase.from('appointments').delete().eq('clinic_id', clinicId)
  await supabase.from('patients').delete().eq('clinic_id', clinicId)
}
