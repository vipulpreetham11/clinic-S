import { supabase } from '@/lib/supabase'
import type {
  InvoiceDetails,
  InvoiceFilters,
  InvoiceListItem,
  InvoiceStats,
  UpsertInvoiceInput,
} from '@/types/invoice'

function normalizeListItem(row: any): InvoiceListItem {
  const patient = Array.isArray(row.patient) ? row.patient[0] ?? null : row.patient
  const appointmentRaw = Array.isArray(row.appointment) ? row.appointment[0] ?? null : row.appointment
  const doctor = appointmentRaw?.doctor
    ? Array.isArray(appointmentRaw.doctor)
      ? appointmentRaw.doctor[0] ?? null
      : appointmentRaw.doctor
    : null

  return {
    ...row,
    patient,
    appointment: appointmentRaw
      ? {
          id: appointmentRaw.id,
          date: appointmentRaw.date,
          doctor_id: appointmentRaw.doctor_id,
          doctor,
        }
      : null,
  }
}

export async function generateInvoiceNumber(clinicId: string) {
  const year = new Date().getFullYear()

  const { data, error } = await supabase.rpc('generate_invoice_number', {
    p_clinic_id: clinicId,
  })

  if (!error && data) {
    return String(data)
  }

  const prefix = `INV-${year}-`
  const { data: existing, error: fetchError } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('clinic_id', clinicId)
    .ilike('invoice_number', `${prefix}%`)

  if (fetchError) throw fetchError

  const maxSeq = (existing || []).reduce((max, invoice) => {
    const num = Number(String(invoice.invoice_number).split('-').pop())
    if (Number.isNaN(num)) return max
    return Math.max(max, num)
  }, 0)

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export async function getInvoices(filters: InvoiceFilters) {
  let query = supabase
    .from('invoices')
    .select(
      `*,
      patient:patients(id, name, phone),
      appointment:appointments(id, date, doctor_id, doctor:doctors(id, name))`
    )
    .eq('clinic_id', filters.clinicId)
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', `${filters.dateFrom}T00:00:00`)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', `${filters.dateTo}T23:59:59`)
  }
  const { data, error } = await query
  if (error) throw error

  let items = (data || []).map(normalizeListItem)

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase()
    items = items.filter(
      (invoice) =>
        invoice.invoice_number.toLowerCase().includes(term) ||
        (invoice.patient?.name ?? '').toLowerCase().includes(term)
    )
  }

  if (filters.doctorId) {
    items = items.filter((invoice) => invoice.appointment?.doctor_id === filters.doctorId)
  }

  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit

  return {
    data: items.slice(from, to),
    count: items.length,
  }
}

export async function getInvoiceById(clinicId: string, invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `*,
      patient:patients(id, name, phone, email, address),
      appointment:appointments(id, date, doctor_id, doctor:doctors(id, name, specialization)),
      clinic:clinics(id, name, address, phone, email, logo_url)`
    )
    .eq('clinic_id', clinicId)
    .eq('id', invoiceId)
    .single()

  if (error) throw error

  const normalized = normalizeListItem(data)
  const clinic = Array.isArray(data.clinic) ? data.clinic[0] ?? null : data.clinic

  return {
    ...normalized,
    clinic,
  } as InvoiceDetails
}

export async function createInvoice(input: UpsertInvoiceInput) {
  const invoiceNumber = input.invoice_number ?? (await generateInvoiceNumber(input.clinic_id))
  const payload = {
    ...input,
    invoice_number: invoiceNumber,
    appointment_id: input.appointment_id ?? null,
    payment_method: input.payment_method ?? null,
    paid_at: input.paid_at ?? null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function updateInvoice(input: UpsertInvoiceInput & { id: string }) {
  const payload = {
    ...input,
    appointment_id: input.appointment_id ?? null,
    payment_method: input.payment_method ?? null,
    paid_at: input.paid_at ?? null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', input.id)
    .eq('clinic_id', input.clinic_id)
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function markInvoicePaid(clinicId: string, invoiceId: string, paymentMethod: string) {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq('clinic_id', clinicId)
    .eq('id', invoiceId)

  if (error) throw error
}

export async function cancelInvoice(clinicId: string, invoiceId: string) {
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'cancelled' })
    .eq('clinic_id', clinicId)
    .eq('id', invoiceId)

  if (error) throw error
}

export async function getInvoiceStats(clinicId: string): Promise<InvoiceStats> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const overdueThreshold = new Date()
  overdueThreshold.setDate(overdueThreshold.getDate() - 30)

  const { data, error } = await supabase
    .from('invoices')
    .select('status, total_amount, created_at')
    .eq('clinic_id', clinicId)

  if (error) throw error

  const invoices = data || []
  const totalRevenue = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  const pendingAmount = invoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'draft')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  const thisMonthRevenue = invoices
    .filter(
      (invoice) =>
        invoice.status === 'paid' && new Date(invoice.created_at).getTime() >= monthStart.getTime()
    )
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)

  const overdueCount = invoices.filter(
    (invoice) =>
      invoice.status === 'sent' && new Date(invoice.created_at).getTime() < overdueThreshold.getTime()
  ).length

  return {
    totalRevenue,
    pendingAmount,
    thisMonthRevenue,
    overdueCount,
  }
}

export async function getPatientAppointments(clinicId: string, patientId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, date, start_time, doctor:doctors(name), service:services(name)')
    .eq('clinic_id', clinicId)
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .limit(30)

  if (error) throw error

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    start_time: row.start_time,
    doctor_name: Array.isArray(row.doctor) ? row.doctor[0]?.name ?? null : row.doctor?.name ?? null,
    service_name: Array.isArray(row.service)
      ? row.service[0]?.name ?? null
      : row.service?.name ?? null,
  }))
}
