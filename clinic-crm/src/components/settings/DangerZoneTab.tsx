import { useState } from 'react'
import { Download, AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useExportClinicData, useResetDemoData } from '@/hooks/useSettings'

const IS_DEV = import.meta.env.DEV

export function DangerZoneTab() {
  const exportData = useExportClinicData()
  const resetDemo = useResetDemoData()
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger zone
          </CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border">
            <div>
              <p className="font-medium">Export all data</p>
              <p className="text-sm text-muted-foreground mt-1">
                Download CSV files for patients, appointments, and invoices
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 shrink-0"
              disabled={exportData.isPending}
              onClick={() => exportData.mutate()}
            >
              {exportData.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export all data
            </Button>
          </div>

          {IS_DEV && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/40 bg-destructive/5">
              <div>
                <p className="font-medium text-destructive">Reset demo data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Deletes all patients, appointments, and invoices for this clinic. Dev only.
                </p>
              </div>
              <Button
                variant="destructive"
                className="shrink-0"
                disabled={resetDemo.isPending}
                onClick={() => setResetOpen(true)}
              >
                Reset demo data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes patients, appointments, and invoices for your clinic.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                resetDemo.mutate(undefined, { onSettled: () => setResetOpen(false) })
              }}
            >
              Yes, reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}