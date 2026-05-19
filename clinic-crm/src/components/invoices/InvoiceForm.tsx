import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { PatientSearch } from '@/components/appointments/PatientSearch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { usePatientAppointments } from '@/hooks/useInvoices'
import { useServices } from '@/hooks/useServices'
import type { Patient } from '@/types'
import type {
  InvoiceDetails,
  InvoiceDiscountType,
  InvoiceLineItem,
  InvoicePaymentMethod,
  InvoiceStatus,
  UpsertInvoiceInput,
} from '@/types/invoice'

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'cancelled']
const PAYMENT_OPTIONS: InvoicePaymentMethod[] = ['cash', 'card', 'upi', 'insurance']

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

interface InvoiceFormProps {
  initialInvoice?: InvoiceDetails | null
  onSubmit: (input: UpsertInvoiceInput, mode: 'draft' | 'send' | 'print') => Promise<void>
  isSubmitting?: boolean
}

export function InvoiceForm({ initialInvoice, onSubmit, isSubmitting = false }: InvoiceFormProps) {
  const navigate = useNavigate()
  const { clinic } = useAuthContext()
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [appointmentId, setAppointmentId] = useState<string>('')
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { name: '', qty: 1, unit_price: 0, total: 0 },
  ])
  const [discountType, setDiscountType] = useState<InvoiceDiscountType>('flat')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [taxPercent, setTaxPercent] = useState(0)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<InvoiceStatus>('draft')
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('cash')

  const { data: appointments = [] } = usePatientAppointments(selectedPatient?.id ?? null)
  const { data: services = [] } = useServices({ search: '', status: 'active' })

  useEffect(() => {
    if (!initialInvoice) return

    setSelectedPatient((initialInvoice.patient as Patient | null) ?? null)
    setAppointmentId(initialInvoice.appointment_id ?? '')
    setLineItems(initialInvoice.line_items.length ? initialInvoice.line_items : [{ name: '', qty: 1, unit_price: 0, total: 0 }])
    setDiscountType(initialInvoice.discount_type)
    setDiscountAmount(initialInvoice.discount_amount)
    setTaxPercent(initialInvoice.tax_percent)
    setNotes(initialInvoice.notes ?? '')
    setStatus(initialInvoice.status)
    setPaymentMethod((initialInvoice.payment_method ?? 'cash') as InvoicePaymentMethod)
  }, [initialInvoice])

  const { subtotal, computedDiscountAmount, taxAmount, totalAmount } = useMemo(() => {
    const subtotalValue = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
    const discountValue =
      discountType === 'percent'
        ? (subtotalValue * Number(discountAmount || 0)) / 100
        : Number(discountAmount || 0)

    const taxableValue = Math.max(subtotalValue - discountValue, 0)
    const taxValue = (taxableValue * Number(taxPercent || 0)) / 100

    return {
      subtotal: subtotalValue,
      computedDiscountAmount: discountValue,
      taxAmount: taxValue,
      totalAmount: taxableValue + taxValue,
    }
  }, [discountAmount, discountType, lineItems, taxPercent])

  function updateLineItem(index: number, patch: Partial<InvoiceLineItem>) {
    setLineItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const next = { ...item, ...patch }
        const qty = Number(next.qty || 0)
        const unitPrice = Number(next.unit_price || 0)
        return {
          ...next,
          qty,
          unit_price: unitPrice,
          total: qty * unitPrice,
        }
      })
    )
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { name: '', qty: 1, unit_price: 0, total: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [{ name: '', qty: 1, unit_price: 0, total: 0 }]
    })
  }

  async function handleSave(mode: 'draft' | 'send' | 'print') {
    if (!clinic?.id) return
    if (!selectedPatient) return

    const cleanedItems = lineItems
      .map((item) => ({
        name: item.name.trim(),
        qty: Number(item.qty),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      }))
      .filter((item) => item.name && item.qty > 0)

    if (!cleanedItems.length) return

    const payload: UpsertInvoiceInput = {
      id: initialInvoice?.id,
      clinic_id: clinic.id,
      patient_id: selectedPatient.id,
      appointment_id: appointmentId || null,
      line_items: cleanedItems,
      subtotal,
      discount_amount: discountAmount,
      discount_type: discountType,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: mode === 'draft' ? 'draft' : status,
      payment_method: paymentMethod,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      notes,
    }

    await onSubmit(payload, mode)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Patient & Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PatientSearch
            clinicId={clinic?.id ?? ''}
            selectedPatient={selectedPatient}
            onPatientSelect={setSelectedPatient}
            onNewPatient={() => navigate('/patients')}
          />

          <div className="space-y-2">
            <Label>Link Appointment (optional)</Label>
            <Select value={appointmentId || 'none'} onValueChange={(value) => setAppointmentId(value === 'none' ? '' : (value ?? ''))}>
              <SelectTrigger>
                <SelectValue placeholder="Select appointment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No appointment</SelectItem>
                {appointments.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {format(new Date(appointment.date), 'dd MMM yyyy')} � {appointment.start_time} � {appointment.doctor_name ?? 'Doctor'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <Label className="mb-1 block">Service</Label>
                <Input
                  list={`invoice-service-list-${index}`}
                  value={item.name}
                  onChange={(event) => {
                    const value = event.target.value
                    updateLineItem(index, { name: value })
                    const matched = services.find((service) => service.name.toLowerCase() === value.toLowerCase())
                    if (matched?.price != null) {
                      updateLineItem(index, { unit_price: Number(matched.price) })
                    }
                  }}
                  placeholder="Service name"
                />
                <datalist id={`invoice-service-list-${index}`}>
                  {services.map((service) => (
                    <option key={service.id} value={service.name} />
                  ))}
                </datalist>
              </div>

              <div className="md:col-span-2">
                <Label className="mb-1 block">Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.qty}
                  onChange={(event) => updateLineItem(index, { qty: Number(event.target.value) })}
                />
              </div>

              <div className="md:col-span-2">
                <Label className="mb-1 block">Unit Price</Label>
                <Input
                  type="number"
                  min={0}
                  value={item.unit_price}
                  onChange={(event) => updateLineItem(index, { unit_price: Number(event.target.value) })}
                />
              </div>

              <div className="md:col-span-2">
                <Label className="mb-1 block">Total</Label>
                <Input value={formatINR(item.total)} readOnly />
              </div>

              <div className="md:col-span-1 flex items-end justify-end">
                <Button variant="ghost" onClick={() => removeLineItem(index)} aria-label="Remove line item">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1 block">Discount Type</Label>
                <Select value={discountType} onValueChange={(value) => setDiscountType(value as InvoiceDiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat (?)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Discount</Label>
                <Input type="number" min={0} value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
              </div>
              <div>
                <Label className="mb-1 block">GST %</Label>
                <Input type="number" min={0} value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))} />
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between py-1"><span>Discount</span><span>- {formatINR(computedDiscountAmount)}</span></div>
              <div className="flex justify-between py-1"><span>Tax</span><span>{formatINR(taxAmount)}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatINR(totalAmount)}</span></div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="mb-1 block">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as InvoicePaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Notes</Label>
            <Textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Additional notes for patient" />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={isSubmitting} onClick={() => void handleSave('draft')}>Save Draft</Button>
            <Button variant="secondary" disabled={isSubmitting} onClick={() => void handleSave('send')}>Save & Send</Button>
            <Button disabled={isSubmitting} onClick={() => void handleSave('print')}>Save & Print</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
