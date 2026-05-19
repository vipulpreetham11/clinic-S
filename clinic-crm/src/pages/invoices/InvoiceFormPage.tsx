import { useNavigate, useParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { getInvoiceById } from '@/api/invoices'
import { useAuthContext } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { InvoicePDF } from '@/components/invoices/InvoicePDF'
import { useCreateInvoice, useInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import type { UpsertInvoiceInput } from '@/types/invoice'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function InvoiceFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const { clinic } = useAuthContext()

  const { data: invoice, isLoading } = useInvoice(id)
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()

  async function handleSubmit(payload: UpsertInvoiceInput, mode: 'draft' | 'send' | 'print') {
    const invoiceId = isEditMode
      ? await updateInvoice.mutateAsync({ ...payload, id: id! })
      : await createInvoice.mutateAsync(payload)

    if (mode === 'print') {
      const targetId = isEditMode ? id! : invoiceId
      if (clinic?.id && targetId) {
        const printable = await getInvoiceById(clinic.id, targetId)
        const blob = await pdf(<InvoicePDF invoice={printable} />).toBlob()
        downloadBlob(blob, `${printable.invoice_number}.pdf`)
      }
    }

    if (mode === 'send') {
      toast.success('Invoice saved and marked as sent')
    }

    navigate(isEditMode ? `/invoices/${id}` : '/invoices')
  }

  if (isEditMode && isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading invoice...</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Edit Invoice' : 'New Invoice'}
        description={isEditMode ? 'Update invoice details' : 'Create a new invoice'}
      />
      <InvoiceForm
        initialInvoice={invoice ?? null}
        onSubmit={handleSubmit}
        isSubmitting={createInvoice.isPending || updateInvoice.isPending}
      />
    </div>
  )
}
