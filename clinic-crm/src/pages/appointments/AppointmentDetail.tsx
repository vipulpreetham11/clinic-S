import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import {
  X, Phone, Crown, AlertTriangle, ExternalLink,
  MessageCircle, FileText, Printer, Calendar,
  CheckCircle, XCircle, Clock, RefreshCw, Edit2, Save,
} from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useAppointment, useUpdateAppointmentStatus, useRescheduleAppointment, useUpdateAppointmentNotes } from '@/hooks/useAppointments'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { SlotPicker } from '@/components/appointments/SlotPicker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import type { AppointmentStatus } from '@/types'

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  admin: 'Admin',
  receptionist: 'Receptionist',
  website: 'Website',
}

const CANCEL_REASONS = [
  'Patient request',
  'Doctor unavailable',
  'Emergency',
  'Other',
]

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm flex-1">{value}</span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${50 + (i * 7) % 40}%` }} />
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, isRole, clinic } = useAuthContext()

  const { data: appointment, isLoading } = useAppointment(id ?? null)
  const updateStatus = useUpdateAppointmentStatus()
  const reschedule = useRescheduleAppointment()
  const updateNotes = useUpdateAppointmentNotes()

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Patient request')
  const [cancelCustomReason, setCancelCustomReason] = useState('')

  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  const [rescheduleDatePickerOpen, setRescheduleDatePickerOpen] = useState(false)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')

  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')

  const appt = appointment as any
  const patient = appt?.patient as any
  const doctor = appt?.doctor as any
  const service = appt?.service as any
  const bookedBy = appt?.booked_by_user as any

  function handleClose() {
    navigate('/appointments')
  }

  function handleStatusAction(status: AppointmentStatus) {
    if (!id) return
    if (status === 'cancelled') {
      setCancelOpen(true)
      return
    }
    updateStatus.mutate({ id, status })
  }

  function handleCancelConfirm() {
    if (!id) return
    const reason = cancelReason === 'Other' ? cancelCustomReason : cancelReason
    updateStatus.mutate(
      { id, status: 'cancelled', extra: { cancellationReason: reason } },
      { onSettled: () => setCancelOpen(false) }
    )
  }

  function handleRescheduleConfirm() {
    if (!id || !rescheduleDate || !rescheduleStart) return
    reschedule.mutate(
      { id, date: rescheduleDate, startTime: rescheduleStart, endTime: rescheduleEnd },
      { onSettled: () => { setRescheduleOpen(false); setRescheduleDate(''); setRescheduleStart('') } }
    )
  }

  function handleSaveNotes() {
    if (!id) return
    updateNotes.mutate(
      { id, notes: notesValue },
      { onSettled: () => setEditingNotes(false) }
    )
  }

  function handleSaveFollowUp() {
    if (!id || !followUpDate) return
    updateStatus.mutate(
      { id, status: appt.status, extra: { followUpDate, followUpNotes } },
      { onSettled: () => setFollowUpOpen(false) }
    )
  }

  const canModify = isRole('admin', 'receptionist', 'doctor')
  const canCancel = isRole('admin', 'receptionist')
  const canGenerateInvoice = isAdmin
  const status: AppointmentStatus = appt?.status

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] sm:max-w-none overflow-y-auto p-0"
      >
        {isLoading ? (
          <div className="p-6">
            <DetailSkeleton />
          </div>
        ) : !appt ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <p className="text-muted-foreground">Appointment not found</p>
            <Button onClick={handleClose}>Go back</Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-5 py-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-base">Appointment Details</SheetTitle>
                    <AppointmentStatusBadge status={status} />
                    {appt.source === 'whatsapp' && (
                      <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-200 bg-green-50">
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">#{appt.id?.slice(0, 8).toUpperCase()}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleClose} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">

                {/* Patient card */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                        {patient?.name ? getInitials(patient.name) : '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{patient?.name ?? 'Unknown'}</span>
                          {patient?.is_vip && (
                            <Crown className="h-4 w-4 text-yellow-500" aria-label="VIP patient" />
                          )}
                        </div>
                        {patient?.phone && (
                          <a
                            href={`https://wa.me/91${patient.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                            aria-label={`Open WhatsApp for ${patient.phone}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {patient.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <Link to={`/patients/${patient?.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Profile
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {patient?.blood_group && (
                      <Badge variant="outline" className="text-xs">{patient.blood_group}</Badge>
                    )}
                    {patient?.allergies && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Allergies: {patient.allergies}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Appointment details */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appointment Info</h4>
                  <div className="space-y-2">
                    <InfoRow label="Service" value={service ? (
                      <span>
                        {service.name}
                        {service.duration_minutes && (
                          <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0">{service.duration_minutes} min</Badge>
                        )}
                        {isAdmin && service.price != null && (
                          <span className="ml-2 text-muted-foreground">₹{service.price}</span>
                        )}
                      </span>
                    ) : undefined} />
                    <InfoRow label="Doctor" value={doctor?.name ? `Dr. ${doctor.name}${doctor.specialization ? ` · ${doctor.specialization}` : ''}` : undefined} />
                    <InfoRow label="Date" value={appt.date ? format(parseISO(appt.date), 'EEEE, d MMMM yyyy') : undefined} />
                    <InfoRow label="Time" value={`${formatTime(appt.start_time)} – ${formatTime(appt.end_time)}`} />
                    <InfoRow label="Source" value={SOURCE_LABEL[appt.source] ?? appt.source} />
                    <InfoRow label="Booked by" value={bookedBy?.name ? `${bookedBy.name} (${bookedBy.role})` : undefined} />
                    <InfoRow label="Created" value={appt.created_at ? formatDistanceToNow(parseISO(appt.created_at), { addSuffix: true }) : undefined} />
                    {appt.cancellation_reason && (
                      <InfoRow label="Cancel reason" value={<span className="text-red-600">{appt.cancellation_reason}</span>} />
                    )}
                    {appt.follow_up_date && (
                      <InfoRow label="Follow-up" value={format(parseISO(appt.follow_up_date), 'd MMM yyyy')} />
                    )}
                  </div>
                </div>

                <Separator />

                {/* Status actions */}
                {canModify && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {status === 'pending' && (
                        <>
                          <Button size="sm" className="gap-1.5" onClick={() => handleStatusAction('confirmed')}
                            disabled={updateStatus.isPending}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Confirm
                          </Button>
                          {canCancel && (
                            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleStatusAction('cancelled')}>
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                        </>
                      )}

                      {['confirmed', 'rescheduled'].includes(status) && (
                        <>
                          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={() => handleStatusAction('completed')}
                            disabled={updateStatus.isPending}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Complete
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                            setRescheduleDate(appt.date)
                            setRescheduleOpen(true)
                          }}>
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reschedule
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleStatusAction('no_show')}
                            disabled={updateStatus.isPending}>
                            <Clock className="h-3.5 w-3.5" />
                            No-show
                          </Button>
                          {canCancel && (
                            <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleStatusAction('cancelled')}>
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                        </>
                      )}

                      {status === 'pending' && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                          setRescheduleDate(appt.date)
                          setRescheduleOpen(true)
                        }}>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reschedule
                        </Button>
                      )}

                      {status === 'completed' && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setFollowUpOpen(true)}>
                          <Calendar className="h-3.5 w-3.5" />
                          Schedule Follow-up
                        </Button>
                      )}

                      {['cancelled', 'no_show'].includes(status) && (
                        <Link to="/appointments/new">
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Rebook
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Notes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h4>
                    {!editingNotes ? (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
                        onClick={() => { setNotesValue(appt.notes ?? ''); setEditingNotes(true) }}>
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => setEditingNotes(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-6 px-2 text-xs gap-1"
                          onClick={handleSaveNotes} disabled={updateNotes.isPending}>
                          <Save className="h-3 w-3" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingNotes ? (
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="resize-none text-sm"
                      rows={3}
                      autoFocus
                      aria-label="Appointment notes"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                      {appt.notes ?? 'No notes for this appointment.'}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Quick actions */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {patient?.phone && (
                      <a href={`https://wa.me/91${patient.phone}?text=Reminder for your appointment`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50">
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp Reminder
                        </Button>
                      </a>
                    )}
                    {canGenerateInvoice && (
                      <Button variant="outline" size="sm" className="gap-1.5"
                        onClick={() => navigate(`/invoices/new?appointmentId=${appt.id}`)}>
                        <FileText className="h-3.5 w-3.5" />
                        Generate Invoice
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Dialog */}
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Please provide a reason for cancellation. This will be recorded.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Reason</Label>
                <Select value={cancelReason} onValueChange={(v) => setCancelReason(v || '')}>
                  <SelectTrigger aria-label="Cancellation reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {cancelReason === 'Other' && (
                <Textarea
                  placeholder="Describe the reason..."
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                  aria-label="Custom cancellation reason"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Appointment</Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={updateStatus.isPending || (cancelReason === 'Other' && !cancelCustomReason.trim())}
              >
                {updateStatus.isPending ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
              <DialogDescription>Select a new date and time slot for this appointment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">New Date</Label>
                <Popover open={rescheduleDatePickerOpen} onOpenChange={setRescheduleDatePickerOpen}>
                  <PopoverTrigger render={
                    <Button type="button" variant="outline" className="w-full justify-start font-normal" aria-label="Select new date">
                      {rescheduleDate ? format(parseISO(rescheduleDate), 'EEEE, d MMMM yyyy') : 'Pick a date'}
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={rescheduleDate ? parseISO(rescheduleDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          setRescheduleDate(format(d, 'yyyy-MM-dd'))
                          setRescheduleStart('')
                          setRescheduleEnd('')
                          setRescheduleDatePickerOpen(false)
                        }
                      }}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {rescheduleDate && doctor?.id && clinic?.id && (
                <div className="space-y-1.5">
                  <Label className="text-sm">New Time Slot</Label>
                  <SlotPicker
                    doctorId={doctor.id}
                    clinicId={clinic.id}
                    date={rescheduleDate}
                    serviceDuration={service?.duration_minutes ?? 30}
                    selectedSlot={rescheduleStart}
                    onSlotSelect={(start, end) => { setRescheduleStart(start); setRescheduleEnd(end) }}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
              <Button
                onClick={handleRescheduleConfirm}
                disabled={!rescheduleDate || !rescheduleStart || reschedule.isPending}
              >
                {reschedule.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Follow-up Dialog */}
        <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Follow-up</DialogTitle>
              <DialogDescription>Set a follow-up date for this patient.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Follow-up Date *</Label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Follow-up date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Notes</Label>
                <Textarea
                  placeholder="Any notes for the follow-up..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                  aria-label="Follow-up notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFollowUpOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveFollowUp} disabled={!followUpDate || updateStatus.isPending}>
                {updateStatus.isPending ? 'Saving...' : 'Save Follow-up'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}
