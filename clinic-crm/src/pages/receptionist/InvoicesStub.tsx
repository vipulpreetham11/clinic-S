import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'

export default function InvoicesStub() {
  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Billing and invoice management" />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold">Invoices coming soon</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Invoice generation and payment tracking will be available for receptionists in a
            future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
