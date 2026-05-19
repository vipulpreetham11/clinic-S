export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'
export type InvoicePaymentMethod = 'cash' | 'card' | 'upi' | 'insurance'
export type InvoiceDiscountType = 'flat' | 'percent'

export interface InvoiceLineItem {
  name: string
  qty: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  clinic_id: string
  patient_id: string
  appointment_id: string | null
  invoice_number: string
  line_items: InvoiceLineItem[]
  subtotal: number
  discount_amount: number
  discount_type: InvoiceDiscountType
  tax_percent: number
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  payment_method: InvoicePaymentMethod | null
  paid_at: string | null
  notes: string | null
  created_at: string
}

export interface InvoiceListItem extends Invoice {
  patient: {
    id: string
    name: string
    phone: string | null
  } | null
  appointment: {
    id: string
    date: string
    doctor_id: string | null
    doctor: { id: string; name: string } | null
  } | null
}

export interface InvoiceDetails extends InvoiceListItem {
  clinic: {
    id: string
    name: string
    address: string | null
    phone: string | null
    email: string | null
    logo_url: string | null
  } | null
}

export interface InvoiceFilters {
  clinicId: string
  status?: InvoiceStatus | 'all'
  dateFrom?: string
  dateTo?: string
  doctorId?: string
  search?: string
  page?: number
  limit?: number
}

export interface InvoiceStats {
  totalRevenue: number
  pendingAmount: number
  thisMonthRevenue: number
  overdueCount: number
}

export interface UpsertInvoiceInput {
  id?: string
  clinic_id: string
  patient_id: string
  appointment_id?: string | null
  invoice_number?: string
  line_items: InvoiceLineItem[]
  subtotal: number
  discount_amount: number
  discount_type: InvoiceDiscountType
  tax_percent: number
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  payment_method?: InvoicePaymentMethod | null
  paid_at?: string | null
  notes?: string | null
}
