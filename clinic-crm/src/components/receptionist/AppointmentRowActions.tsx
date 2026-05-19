import { useState } from 'react'
import { Eye, LogIn, CheckCircle, UserX, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppointmentActions } from '@/hooks/useAppointmentActions'
import type { AppointmentStatus } from '@/types'

const CANCEL_REASONS = [
  'Patient request',
  'Doctor unavailable',
  'Emergency',
  'Other',
]

interface AppointmentRowActionsProps {
  appointmentId: string
  status: AppointmentStatus
  onView: () => void
}

export function AppointmentRowActions({
  appointmentId,
  status,
  onView,
}: AppointmentRowActionsProps) {
  const { checkIn, complete, cancel, noShow, isPending, pendingId } = useAppointmentActions()
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Patient request')
  const [cancelCustom, setCancelCustom] = useState('')

  const loading = isPending && pendingId === appointmentId

  function handleCancelConfirm() {
    const reason = cancelReason === 'Other' ? cancelCustom : cancelReason
    cancel(appointmentId, reason || 'Cancelled by reception')
    setCancelOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Appointment actions">
      {(status === 'pending' || status === 'rescheduled') && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 px-2"
          disabled={loading}
          onClick={() => checkIn(appointmentId)}
        >
          <LogIn className="h-3 w-3" />
          Check In
        </Button>
      )}

      {status === 'confirmed' && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 px-2"
          disabled={loading}
          onClick={() => complete(appointmentId)}
        >
          <CheckCircle className="h-3 w-3" />
          Complete
        </Button>
      )}

      {!['completed', 'cancelled', 'no_show'].includes(status) && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2 text-orange-700 border-orange-200 hover:bg-orange-50"
            disabled={loading}
            onClick={() => setNoShowOpen(true)}
          >
            <UserX className="h-3 w-3" />
            No Show
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 px-2 text-red-700 border-red-200 hover:bg-red-50"
            disabled={loading}
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="h-3 w-3" />
            Cancel
          </Button>
        </>
      )}

      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2" onClick={onView}>
        <Eye className="h-3 w-3" />
        View
      </Button>

      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as no-show?</DialogTitle>
            <DialogDescription>
              This will mark the patient as a no-show for today&apos;s appointment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => {
                noShow(appointmentId)
                setNoShowOpen(false)
              }}
            >
              Confirm no-show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel appointment</DialogTitle>
            <DialogDescription>Please provide a reason for cancellation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={cancelReason} onValueChange={(val: any) => setCancelReason(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANCEL_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cancelReason === 'Other' && (
              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  value={cancelCustom}
                  onChange={(e) => setCancelCustom(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button variant="destructive" disabled={loading} onClick={handleCancelConfirm}>
              Cancel appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
