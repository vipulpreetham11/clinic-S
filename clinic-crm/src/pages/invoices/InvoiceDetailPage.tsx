import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { pdf } from '@react-pdf/renderer'
import { Download, Edit, IndianRupee, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvoicePDF } from '@/components/invoices/InvoicePDF'
import { useCancelInvoice, useInvoice, useMarkInvoicePaid } from '@/hooks/useInvoices'

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

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

export default function InvoiceDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: invoice, isLoading } = useInvoice(id)
  const markPaid = useMarkInvoicePaid()
  const cancelInvoice = useCancelInvoice()

  async function handleDownloadPdf() {
    if (!invoice) return
    const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob()
    downloadBlob(blob, `${invoice.invoice_number}.pdf`)
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading invoice...</div>
  }

  if (!invoice) {
    return <div className="p-6 text-sm text-muted-foreground">Invoice not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={`Created on ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => void handleDownloadPdf()}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Button
                variant="secondary"
                onClick={() => markPaid.mutate({ invoiceId: invoice.id, paymentMethod: invoice.payment_method ?? 'cash' })}
              >
                <IndianRupee className="mr-2 h-4 w-4" />
                Mark Paid
              </Button>
            )}
            {invoice.status !== 'cancelled' && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invoice Summary</span>
            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'cancelled' ? 'destructive' : 'outline'} className="capitalize">
              {invoice.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Patient</p>
            <p className="font-medium">{invoice.patient?.name ?? '-'}</p>
            <p className="text-sm text-muted-foreground">{invoice.patient?.phone ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-medium capitalize">{invoice.payment_method ?? '-'}</p>
            <p className="text-sm text-muted-foreground">
              {invoice.paid_at ? `Paid on ${format(new Date(invoice.paid_at), 'dd MMM yyyy, hh:mm a')}` : 'Unpaid'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Appointment</p>
            <p className="font-medium">{invoice.appointment ? format(new Date(invoice.appointment.date), 'dd MMM yyyy') : 'Not linked'}</p>
            <p className="text-sm text-muted-foreground">{invoice.appointment?.doctor?.name ? `Dr. ${invoice.appointment.doctor.name}` : '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item, index) => (
                  <TableRow key={`${item.name}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">{formatINR(item.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatINR(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 ml-auto w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- {formatINR(invoice.discount_type === 'percent' ? (invoice.subtotal * invoice.discount_amount) / 100 : invoice.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Tax ({invoice.tax_percent}%)</span><span>{formatINR(invoice.tax_amount)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatINR(invoice.total_amount)}</span></div>
          </div>
        </CardContent>
      </Card>

      {!!invoice.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{invoice.notes}</p></CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Invoice"
        description="Are you sure you want to cancel this invoice?"
        confirmText="Cancel Invoice"
        variant="destructive"
        loading={cancelInvoice.isPending}
        onConfirm={() => cancelInvoice.mutate(invoice.id, { onSuccess: () => setCancelOpen(false) })}
      />
    </div>
  )
}
