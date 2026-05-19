import { useEffect, useMemo, useState } from 'react'
import { format, isAfter, isBefore, parseISO, differenceInCalendarDays } from 'date-fns'
import { CalendarIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import * as doctorsApi from '@/api/doctors'
import type { DoctorLeave } from '@/api/doctors'
import { useAddDoctorLeave, useDeleteDoctorLeave } from '@/hooks/useDoctors'

interface LeaveManagerProps {
  doctorId: string
  clinicId: string
  readOnly?: boolean
}

export function LeaveManager({ doctorId, clinicId, readOnly }: LeaveManagerProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DoctorLeave | null>(null)
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [warning, setWarning] = useState<{ count: number; items: any[] } | null>(null)
  const [checking, setChecking] = useState(false)

  const addLeave = useAddDoctorLeave()
  const deleteLeave = useDeleteDoctorLeave()
  const queryClient = useQueryClient()

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['doctor-leaves', doctorId],
    queryFn: () => doctorsApi.getDoctorLeaves(doctorId),
    enabled: !!doctorId,
  })

  const today = new Date()

  const upcomingLeaves = useMemo(() =>
    leaves.filter((l: DoctorLeave) => !isBefore(parseISO(l.to_date), today)), [leaves, today]
  )
  const pastLeaves = useMemo(() =>
    leaves.filter((l: DoctorLeave) => isBefore(parseISO(l.to_date), today)), [leaves, today]
  )

  const daysCount = useMemo(() => {
    if (!fromDate || !toDate) return 0
    return differenceInCalendarDays(toDate, fromDate) + 1
  }, [fromDate, toDate])

  useEffect(() => {
    if (!fromDate || !toDate) {
      setWarning(null)
      return
    }

    const fromStr = format(fromDate, 'yyyy-MM-dd')
    const toStr = format(toDate, 'yyyy-MM-dd')
    setChecking(true)

    doctorsApi.getDoctorAppointmentsInRange(doctorId, fromStr, toStr)
      .then((data) => {
        if (data.length > 0) {
          setWarning({ count: data.length, items: data })
        } else {
          setWarning(null)
        }
      })
      .catch(() => setWarning(null))
      .finally(() => setChecking(false))
  }, [doctorId, fromDate, toDate])

  function resetDialog() {
    setEditing(null)
    setFromDate(undefined)
    setToDate(undefined)
    setReason('')
    setWarning(null)
  }

  function openCreate() {
    resetDialog()
    setOpen(true)
  }

  function openEdit(leave: DoctorLeave) {
    setEditing(leave)
    setFromDate(parseISO(leave.from_date))
    setToDate(parseISO(leave.to_date))
    setReason(leave.reason ?? '')
    setOpen(true)
  }

  async function handleSave() {
    if (!fromDate || !toDate) {
      toast.error('Please select both dates')
      return
    }
    if (isAfter(fromDate, toDate)) {
      toast.error('From date must be before To date')
      return
    }

    const payload = {
      doctor_id: doctorId,
      clinic_id: clinicId,
      from_date: format(fromDate, 'yyyy-MM-dd'),
      to_date: format(toDate, 'yyyy-MM-dd'),
      reason: reason.trim() || null,
    }

    try {
      if (editing) {
        await doctorsApi.updateDoctorLeave(editing.id, payload)
        queryClient.invalidateQueries({ queryKey: ['doctor-leaves', doctorId] })
      } else {
        await addLeave.mutateAsync(payload)
      }
      setOpen(false)
      resetDialog()
    } catch (error: any) {
      toast.error('Failed to save leave', { description: error?.message })
    }
  }

  async function handleDelete(id: string) {
    if (readOnly) return
    await deleteLeave.mutateAsync(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Upcoming leaves</h3>
        {!readOnly && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Leave
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : upcomingLeaves.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming leaves.</p>
      ) : (
        <div className="space-y-2">
          {upcomingLeaves.map((leave: DoctorLeave) => (
            <div key={leave.id} className="rounded-lg border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {format(parseISO(leave.from_date), 'MMM d, yyyy')} - {format(parseISO(leave.to_date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {leave.reason || 'No reason provided'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{differenceInCalendarDays(parseISO(leave.to_date), parseISO(leave.from_date)) + 1} days</Badge>
                {!readOnly && (
                  <>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(leave)} aria-label="Edit leave">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(leave.id)} aria-label="Delete leave">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pastLeaves.length > 0 && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Past leaves</summary>
          <div className="mt-3 space-y-2">
            {pastLeaves.map((leave: DoctorLeave) => (
              <div key={leave.id} className="rounded-lg border p-3 flex items-center justify-between opacity-70">
                <div>
                  <p className="text-sm font-medium">
                    {format(parseISO(leave.from_date), 'MMM d, yyyy')} - {format(parseISO(leave.to_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leave.reason || 'No reason provided'}
                  </p>
                </div>
                {!readOnly && (
                  <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(leave.id)} aria-label="Delete leave">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Leave' : 'Add Leave'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">From Date</span>
                <Popover>
                  <PopoverTrigger {...({ asChild: true } as any)}>
                    <Button variant="outline" className={cn('w-full justify-between')}> 
                      {fromDate ? format(fromDate, 'PPP') : 'Select date'}
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <Calendar mode="single" selected={fromDate} onSelect={setFromDate} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">To Date</span>
                <Popover>
                  <PopoverTrigger {...({ asChild: true } as any)}>
                    <Button variant="outline" className={cn('w-full justify-between')}> 
                      {toDate ? format(toDate, 'PPP') : 'Select date'}
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <Calendar mode="single" selected={toDate} onSelect={setToDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {daysCount > 0 && (
              <p className="text-xs text-muted-foreground">{daysCount} day{daysCount > 1 ? 's' : ''}</p>
            )}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Reason</span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vacation, conference, etc." />
            </div>

            {checking && <p className="text-xs text-muted-foreground">Checking for affected appointments...</p>}
            {warning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">{warning.count} appointments exist during this period.</p>
                <p className="mt-1">They will need to be rescheduled manually.</p>
                <div className="mt-2 max-h-32 overflow-auto space-y-1">
                  {warning.items.map((appt: any) => (
                    <div key={appt.id} className="flex items-center justify-between">
                      <span>{appt.date} {appt.start_time}</span>
                      <span className="text-amber-700">{appt.patient?.name ?? 'Patient'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={addLeave.isPending}>
              {editing ? 'Update Leave' : 'Add Leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
