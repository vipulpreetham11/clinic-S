import { useMemo, useState } from 'react'
import { format, parseISO, eachDayOfInterval, isAfter, startOfDay } from 'date-fns'
import { Calendar as CalendarIcon, Ban, Unlock } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/api/doctors'
import { useAuthContext } from '@/context/AuthContext'
import {
  useDoctorAppointmentsByMonth,
  useDoctorBlockedDates,
  useDoctorLeaves,
  useAddBlockedDate,
  useDeleteBlockedDate,
  useDeleteDoctorLeave,
} from '@/hooks/useDoctors'

interface DoctorScheduleCalendarProps {
  doctor: Doctor
}

export function DoctorScheduleCalendar({ doctor }: DoctorScheduleCalendarProps) {
  const { clinic, isRole } = useAuthContext()
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [blockReason, setBlockReason] = useState('')

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  const { data: appointments = [] } = useDoctorAppointmentsByMonth(doctor.id, year, month)
  const { data: leaves = [] } = useDoctorLeaves(doctor.id, year, month)
  const { data: blockedDates = [] } = useDoctorBlockedDates(doctor.id, year, month)

  const addBlockedDate = useAddBlockedDate()
  const deleteBlockedDate = useDeleteBlockedDate()
  const deleteLeave = useDeleteDoctorLeave()

  const appointmentCountByDate = useMemo(() => {
    const map: Record<string, number> = {}
    appointments.forEach((appt: any) => {
      map[appt.date] = (map[appt.date] || 0) + 1
    })
    return map
  }, [appointments])

  const leaveByDate = useMemo(() => {
    const map: Record<string, any> = {}
    leaves.forEach((leave: any) => {
      const days = eachDayOfInterval({ start: parseISO(leave.from_date), end: parseISO(leave.to_date) })
      days.forEach((d) => {
        map[format(d, 'yyyy-MM-dd')] = leave
      })
    })
    return map
  }, [leaves])

  const blockedByDate = useMemo(() => {
    const map: Record<string, any> = {}
    blockedDates.forEach((b: any) => { map[b.date] = b })
    return map
  }, [blockedDates])

  const workingDays = doctor.working_days ?? []

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const isWorkingDay = selectedDate ? workingDays.includes(format(selectedDate, 'EEE')) : false
  const selectedAppointments = appointments.filter((appt: any) => appt.date === selectedDateStr)
  const selectedLeave = selectedDateStr ? leaveByDate[selectedDateStr] : null
  const selectedBlock = selectedDateStr ? blockedByDate[selectedDateStr] : null

  const isFuture = selectedDate ? isAfter(startOfDay(selectedDate), startOfDay(new Date())) : false

  async function handleBlockDate() {
    if (!clinic?.id || !selectedDate || !doctor.id) return
    await addBlockedDate.mutateAsync({
      clinic_id: clinic.id,
      doctor_id: doctor.id,
      date: selectedDateStr,
      reason: blockReason.trim() || undefined,
    })
    setBlockReason('')
  }

  async function handleUnblock() {
    if (!selectedBlock?.id) return
    await deleteBlockedDate.mutateAsync(selectedBlock.id)
  }

  async function handleRemoveLeave() {
    if (!selectedLeave?.id) return
    await deleteLeave.mutateAsync(selectedLeave.id)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-lg border p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={{
            working: (date) => workingDays.includes(format(date, 'EEE')),
            nonWorking: (date) => !workingDays.includes(format(date, 'EEE')),
            leave: (date) => !!leaveByDate[format(date, 'yyyy-MM-dd')],
            blocked: (date) => !!blockedByDate[format(date, 'yyyy-MM-dd')],
            hasAppointments: (date) => (appointmentCountByDate[format(date, 'yyyy-MM-dd')] ?? 0) > 0,
          }}
          modifiersClassNames={{
            nonWorking: 'opacity-40',
            leave: 'bg-amber-100 text-amber-900 data-[selected-single=true]:bg-amber-200',
            blocked: 'bg-red-100 text-red-900 data-[selected-single=true]:bg-red-200',
            hasAppointments: 'font-semibold',
          }}
          components={{
            DayButton: ({ day, modifiers, ...props }) => {
              const dateStr = format(day.date, 'yyyy-MM-dd')
              const count = appointmentCountByDate[dateStr] ?? 0
              const isLeave = !!leaveByDate[dateStr]
              const isBlocked = !!blockedByDate[dateStr]
              const isSelected = !!modifiers.selected
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'relative h-9 w-9 rounded-md',
                    isSelected && 'bg-primary text-primary-foreground'
                  )}
                  data-selected-single={isSelected && !modifiers.range_middle}
                  {...props}
                >
                  <span>{day.date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute -bottom-0.5 right-0 text-[10px] font-semibold text-primary">{count}</span>
                  )}
                  {isLeave && <span className="absolute -top-0.5 left-0 text-[9px]">L</span>}
                  {isBlocked && <span className="absolute -top-0.5 left-0 text-[9px]">X</span>}
                </Button>
              )
            },
          }}
        />
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{selectedDate ? format(selectedDate, 'PPP') : 'Select a day'}</p>
            <p className="text-xs text-muted-foreground">{selectedDate ? format(selectedDate, 'EEEE') : ''}</p>
          </div>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        {selectedLeave && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-amber-900">Leave day</p>
            <p className="text-xs text-amber-700">{selectedLeave.reason || 'No reason provided'}</p>
            {isRole('admin', 'clinic_admin') && (
              <Button size="sm" variant="outline" className="mt-2" onClick={handleRemoveLeave}>
                Remove Leave
              </Button>
            )}
          </div>
        )}

        {selectedBlock && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <p className="font-semibold text-red-900">Blocked day</p>
            <p className="text-xs text-red-700">{selectedBlock.reason || 'No reason provided'}</p>
            {isRole('admin', 'clinic_admin') && (
              <Button size="sm" variant="outline" className="mt-2" onClick={handleUnblock}>
                <Unlock className="mr-1 h-3.5 w-3.5" />
                Unblock
              </Button>
            )}
          </div>
        )}

        {!selectedLeave && !selectedBlock && selectedDate && isFuture && isWorkingDay && isRole('admin', 'clinic_admin') && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Block this day</p>
            <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason (optional)" />
            <Button size="sm" variant="outline" onClick={handleBlockDate} className="gap-1.5">
              <Ban className="h-4 w-4" />
              Block Date
            </Button>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">Appointments</p>
          {selectedAppointments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No appointments scheduled.</p>
          ) : (
            <div className="space-y-2">
              {selectedAppointments.map((appt: any) => (
                <div key={appt.id} className="rounded-lg border p-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold">{appt.start_time} - {appt.end_time}</p>
                    <p className="text-muted-foreground">{appt.patient?.name ?? 'Patient'}</p>
                  </div>
                  <Badge variant="outline">{appt.service?.name ?? 'Service'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
