import { useQuery } from '@tanstack/react-query'
import { RefreshCw, AlertTriangle, Clock, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateAvailableSlots } from '@/lib/slotGenerator'
import { useBookedSlots } from '@/hooks/useAppointments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO, isWithinInterval } from 'date-fns'

interface SlotPickerProps {
  doctorId: string
  clinicId: string
  date: string
  serviceDuration: number
  onSlotSelect: (start: string, end: string) => void
  selectedSlot?: string
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function getPeriod(time: string): 'morning' | 'afternoon' | 'evening' {
  const [h] = time.split(':').map(Number)
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function useDoctorDetails(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-slot-details', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, doctor_breaks(*)')
        .eq('id', doctorId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!doctorId,
    staleTime: 1000 * 60 * 5,
  })
}

function useDoctorLeaves(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-leaves', doctorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('doctor_leaves')
        .select('from_date, to_date')
        .eq('doctor_id', doctorId)
      return data || []
    },
    enabled: !!doctorId,
    staleTime: 1000 * 60 * 5,
  })
}

function useBlockedDates(doctorId: string, clinicId: string, date: string) {
  return useQuery({
    queryKey: ['blocked-dates', doctorId, clinicId, date],
    queryFn: async () => {
      const { data } = await supabase
        .from('blocked_dates')
        .select('date, reason')
        .eq('date', date)
        .or(`doctor_id.eq.${doctorId},clinic_id.eq.${clinicId}`)
      return data || []
    },
    enabled: !!doctorId && !!date,
    staleTime: 1000 * 60,
  })
}

const PERIOD_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

const PERIOD_RANGES = {
  morning: '6 AM – 12 PM',
  afternoon: '12 PM – 5 PM',
  evening: '5 PM – 9 PM',
}

export function SlotPicker({ doctorId, clinicId, date, serviceDuration, onSlotSelect, selectedSlot }: SlotPickerProps) {
  const { data: doctor, isLoading: doctorLoading } = useDoctorDetails(doctorId)
  const { data: leaves = [], isLoading: leavesLoading } = useDoctorLeaves(doctorId)
  const { data: blockedDates = [], isLoading: blockedLoading } = useBlockedDates(doctorId, clinicId, date)
  const { data: bookedSlots = [], isLoading: slotsLoading, refetch } = useBookedSlots(doctorId, date)

  const isLoading = doctorLoading || leavesLoading || blockedLoading || slotsLoading

  const onLeave = leaves.some((leave: any) => {
    try {
      return isWithinInterval(parseISO(date), {
        start: parseISO(leave.from_date),
        end: parseISO(leave.to_date),
      })
    } catch {
      return false
    }
  })

  const isBlocked = blockedDates.length > 0
  const blockedReason = (blockedDates[0] as any)?.reason

  const dayName = date ? format(parseISO(date), 'EEE') : ''
  const notWorkingDay = doctor && !doctor.working_days?.includes(dayName)

  const availableSlots: string[] = !isLoading && doctor && !onLeave && !isBlocked && !notWorkingDay
    ? generateAvailableSlots({
        doctor: {
          arrival_time: doctor.arrival_time,
          departure_time: doctor.departure_time,
          slot_duration: serviceDuration || doctor.slot_duration,
          working_days: doctor.working_days,
        },
        breaks: doctor.doctor_breaks || [],
        existingAppointments: bookedSlots,
        blockedDates: [],
        date,
      })
    : []

  const allGeneratedSlots: string[] = !isLoading && doctor
    ? generateAvailableSlots({
        doctor: {
          arrival_time: doctor.arrival_time,
          departure_time: doctor.departure_time,
          slot_duration: serviceDuration || doctor.slot_duration,
          working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        breaks: [],
        existingAppointments: [],
        blockedDates: [],
        date: date || format(new Date(), 'yyyy-MM-dd'),
      })
    : []

  const bookedSlotTimes = new Set(bookedSlots.map((s) => s.start_time))

  const slotsByPeriod = {
    morning: availableSlots.filter((s) => getPeriod(s) === 'morning'),
    afternoon: availableSlots.filter((s) => getPeriod(s) === 'afternoon'),
    evening: availableSlots.filter((s) => getPeriod(s) === 'evening'),
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-5 w-24 mb-2" />
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (onLeave) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-800">Doctor is on leave</p>
          <p className="text-sm text-yellow-700">This doctor is unavailable on the selected date.</p>
        </div>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <Ban className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-800">Date is blocked</p>
          <p className="text-sm text-red-700">{blockedReason ?? 'This date has been blocked for appointments.'}</p>
        </div>
      </div>
    )
  }

  if (notWorkingDay) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <Clock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-gray-700">Not a working day</p>
          <p className="text-sm text-gray-500">
            Dr. {doctor?.name} doesn't work on {dayName ? format(parseISO(date), 'eeee') : 'this day'}s.
          </p>
        </div>
      </div>
    )
  }

  if (availableSlots.length === 0 && allGeneratedSlots.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">All slots taken</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2 gap-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Clock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-700">No slots available</p>
            <p className="text-sm text-gray-500">All time slots for this date are booked. Try a different date.</p>
          </div>
        </div>
      </div>
    )
  }

  const totalAvailable = availableSlots.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalAvailable}</span> slot{totalAvailable !== 1 ? 's' : ''} available
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2 gap-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {(['morning', 'afternoon', 'evening'] as const).map((period) => {
        const periodSlots = slotsByPeriod[period]
        if (periodSlots.length === 0) return null

        return (
          <div key={period} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {PERIOD_LABELS[period]}
              </p>
              <span className="text-xs text-muted-foreground">· {PERIOD_RANGES[period]}</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {periodSlots.map((slot) => {
                const isSelected = selectedSlot === slot
                const isBooked = bookedSlotTimes.has(slot)
                const endMinutes = timeToMinutes(slot) + (serviceDuration || doctor?.slot_duration || 30)
                const endTime = minutesToTime(endMinutes)

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked}
                    onClick={() => onSlotSelect(slot, endTime)}
                    aria-pressed={isSelected}
                    aria-label={`${formatDisplayTime(slot)} slot${isBooked ? ', booked' : ''}`}
                    className={`
                      h-10 rounded-md text-xs font-medium border transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                      ${isBooked
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-white text-foreground border-border hover:border-primary hover:bg-primary/5'
                      }
                    `}
                  >
                    {formatDisplayTime(slot)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
