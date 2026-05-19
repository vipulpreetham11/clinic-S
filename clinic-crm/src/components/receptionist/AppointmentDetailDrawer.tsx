import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Phone, AlertTriangle, Crown, X, Save } from 'lucide-react'
import { useAppointment, useUpdateAppointmentNotes } from '@/hooks/useAppointments'
import { ReceptionistStatusBadge } from '@/components/receptionist/ReceptionistStatusBadge'
import { AppointmentRowActions } from '@/components/receptionist/AppointmentRowActions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatTime12h, getInitials, getPatientAge, getDurationMinutes } from '@/lib/formatTime'
import type { AppointmentStatus } from '@/types'
import { cn } from '@/lib/utils'

const TIMELINE_STEPS: { status: AppointmentStatus; label: string }[] = [
  { status: 'pending', label: 'Scheduled' },
  { status: 'confirmed', label: 'Checked In' },
  { status: 'completed', label: 'Completed' },
]

interface AppointmentDetailDrawerProps {
  appointmentId: string | null
  onClose: () => void
}

function getStepIndex(status: AppointmentStatus): number {
  if (status === 'cancelled' || status === 'no_show') return -1
  if (status === 'rescheduled') return 0
  if (status === 'completed') return 2
  if (status === 'confirmed') return 1
  return 0
}

export function AppointmentDetailDrawer({ appointmentId, onClose }: AppointmentDetailDrawerProps) {
  const { data: appointment, isLoading } = useAppointment(appointmentId)
  const updateNotes = useUpdateAppointmentNotes()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  const appt = appointment as Record<string, unknown> | undefined
  const patient = appt?.patient as Record<string, unknown> | undefined
  const doctor = appt?.doctor as Record<string, unknown> | undefined
  const service = appt?.service as Record<string, unknown> | undefined
  const status = (appt?.status as AppointmentStatus) ?? 'pending'
  const stepIndex = getStepIndex(status)

  function startEditNotes() {
    setNotesValue((appt?.notes as string) || '')
    setEditingNotes(true)
  }

  function saveNotes() {
    if (!appointmentId) return
    updateNotes.mutate(
      { id: appointmentId, notes: notesValue },
      { onSettled: () => setEditingNotes(false) }
    )
  }

  return (
    <Sheet open={!!appointmentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] sm:max-w-none overflow-y-auto p-0"
      >
        <SheetHeader className="px-5 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-base">Appointment Details</SheetTitle>
              {appointmentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  #{appointmentId.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !appt ? (
          <p className="p-6 text-muted-foreground text-sm">Appointment not found.</p>
        ) : (
          <div className="p-5 space-y-6">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Patient
              </h3>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {getInitials((patient?.name as string) || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{patient?.name as string}</p>
                    {!!patient?.is_vip && <Crown className="h-4 w-4 text-yellow-500" />}
                    <ReceptionistStatusBadge status={status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{patient?.phone as string}</p>
                  {getPatientAge(patient?.date_of_birth as string) && (
                    <p className="text-sm text-muted-foreground">
                      Age: {getPatientAge(patient?.date_of_birth as string)}
                    </p>
                  )}
                  {!!patient?.allergies && (
                    <p className="text-sm text-red-700 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Allergies: {String(patient.allergies)}
                    </p>
                  )}
                </div>
              </div>
              {typeof patient?.phone === 'string' && patient.phone && (
                <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                  <a href={`tel:${patient.phone as string}`}>
                    <Phone className="h-4 w-4" />
                    Call patient
                  </a>
                </Button>
              )}
            </section>

            <Separator />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Appointment
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Doctor</dt>
                  <dd className="font-medium text-right">Dr. {doctor?.name as string}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Service</dt>
                  <dd className="font-medium text-right">{service?.name as string}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="font-medium text-right">
                    {appt.date
                      ? format(parseISO(appt.date as string), 'EEE, d MMM yyyy')
                      : ''}{' '}
                    · {formatTime12h(appt.start_time as string)} –{' '}
                    {formatTime12h(appt.end_time as string)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="font-medium">
                    {getDurationMinutes(
                      appt.start_time as string,
                      appt.end_time as string
                    )}{' '}
                    min
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Status timeline
              </h3>
              {['cancelled', 'no_show'].includes(status) ? (
                <p className="text-sm capitalize text-muted-foreground">
                  Appointment marked as {status.replace('_', ' ')}
                </p>
              ) : (
                <ol className="flex items-center gap-1">
                  {TIMELINE_STEPS.map((step, i) => (
                    <li key={step.status} className="flex items-center flex-1 min-w-0">
                      <div
                        className={cn(
                          'flex flex-col items-center flex-1 text-center',
                          i <= stepIndex ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        <div
                          className={cn(
                            'h-3 w-3 rounded-full border-2 mb-1',
                            i <= stepIndex
                              ? 'bg-primary border-primary'
                              : 'bg-background border-muted-foreground/40'
                          )}
                        />
                        <span className="text-[10px] font-medium leading-tight">{step.label}</span>
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={cn(
                            'h-0.5 flex-1 -mt-4',
                            i < stepIndex ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Separator />

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </h3>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={startEditNotes}>
                    Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveNotes} disabled={updateNotes.isPending}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {(appt.notes as string) || 'No notes yet.'}
                </p>
              )}
            </section>

            {appointmentId && (
              <div className="pt-2 border-t">
                <AppointmentRowActions
                  appointmentId={appointmentId}
                  status={status}
                  onView={onClose}
                />
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}