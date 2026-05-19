import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { FileText, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDoctors } from '@/hooks/useDoctors'
import { useInvoiceStats, useInvoices } from '@/hooks/useInvoices'
import type { InvoiceStatus } from '@/types/invoice'

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

const STATUS_COLORS: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  draft: 'outline',
  sent: 'secondary',
  paid: 'default',
  cancelled: 'destructive',
}

export default function Invoices() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [doctorId, setDoctorId] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: doctors = [] } = useDoctors()
  const { data: invoicesData, isLoading } = useInvoices({
    status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    doctorId: doctorId === 'all' ? undefined : doctorId,
    search,
    page,
    limit: 15,
  })

  const { data: stats } = useInvoiceStats()

  const invoices = invoicesData?.data ?? []
  const totalCount = invoicesData?.count ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / 15), 1)

  const cards = useMemo(
    () => [
      { label: 'Total Revenue', value: formatINR(stats?.totalRevenue ?? 0), color: 'teal' as const },
      { label: 'Pending Amount', value: formatINR(stats?.pendingAmount ?? 0), color: 'amber' as const },
      { label: 'This Month', value: formatINR(stats?.thisMonthRevenue ?? 0), color: 'blue' as const },
      { label: 'Overdue', value: String(stats?.overdueCount ?? 0), color: 'red' as const },
    ],
    [stats]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Billing and payment records"
        action={
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-sm font-medium text-slate-500 mb-3">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by patient or invoice #"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              />
            </div>

            <Select value={status} onValueChange={(value) => { setStatus(value as InvoiceStatus | 'all'); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={doctorId} onValueChange={(value) => { setDoctorId(value ?? 'all'); setPage(1) }}>
              <SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>Dr. {doctor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No invoices found"
              description="Create your first invoice to start billing."
              action={<Button onClick={() => navigate('/invoices/new')}>New Invoice</Button>}
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.patient?.name ?? 'Unknown'}</TableCell>
                      <TableCell>{format(new Date(invoice.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{formatINR(invoice.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[invoice.status] ?? 'outline'} className="capitalize">
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalCount > 15 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
