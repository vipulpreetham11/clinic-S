import { useRef, useEffect } from 'react'
import { Crown, AlertTriangle } from 'lucide-react'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import type { AppointmentWithDetails, Doctor } from '@/types'

interface TimelineViewProps {
  appointments: AppointmentWithDetails[]
  doctors: Doctor[]
  onAppointmentClick: (id: string) => void
}

const START_HOUR = 7
const END_HOUR = 21
const TOTAL_HOURS = END_HOUR - START_HOUR
const PX_PER_HOUR = 80

function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - START_HOUR + m / 60) * PX_PER_HOUR
}

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH} ${period}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 border-yellow-300 text-yellow-900',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-900',
  completed: 'bg-green-100 border-green-300 text-green-900',
  cancelled: 'bg-red-100 border-red-300 text-red-900',
  no_show: 'bg-gray-100 border-gray-300 text-gray-700',
  rescheduled: 'bg-purple-100 border-purple-300 text-purple-900',
}

export function TimelineView({ appointments, doctors, onAppointmentClick }: TimelineViewProps) {
  const currentTimeRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentOffset = (now.getHours() - START_HOUR + now.getMinutes() / 60) * PX_PER_HOUR

  useEffect(() => {
    currentTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const byDoctor = doctors.reduce<Record<string, AppointmentWithDetails[]>>((acc, d) => {
    acc[d.id] = appointments.filter((a) => a.doctor_id === d.id)
    return acc
  }, {})

  const visibleDoctors = doctors.filter((d) => d.is_active)

  if (visibleDoctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No active doctors to display
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <div className="min-w-max">
        {/* Header row */}
        <div className="flex sticky top-0 z-10 bg-background border-b">
          <div className="w-16 shrink-0 border-r" />
          {visibleDoctors.map((doctor) => (
            <div key={doctor.id} className="w-52 shrink-0 border-r px-3 py-2 last:border-r-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {getInitials(doctor.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Dr. {doctor.name}</p>
                  {doctor.specialization && (
                    <p className="text-xs text-muted-foreground truncate">{doctor.specialization}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline body */}
        <div className="flex">
          {/* Time column */}
          <div className="w-16 shrink-0 border-r relative" style={{ height: TOTAL_HOURS * PX_PER_HOUR }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 flex items-center justify-end pr-2"
                style={{ top: (h - START_HOUR) * PX_PER_HOUR - 8 }}
              >
                <span className="text-xs text-muted-foreground">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Doctor columns */}
          {visibleDoctors.map((doctor) => {
            const doctorAppts = byDoctor[doctor.id] ?? []

            return (
              <div
                key={doctor.id}
                className="w-52 shrink-0 border-r last:border-r-0 relative"
                style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
              >
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: (h - START_HOUR) * PX_PER_HOUR }}
                  />
                ))}

                {/* Half-hour lines */}
                {hours.map((h) => (
                  <div
                    key={`${h}-half`}
                    className="absolute left-0 right-0 border-t border-dashed border-border/30"
                    style={{ top: (h - START_HOUR) * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                  />
                ))}

                {/* Current time indicator */}
                {now.getHours() >= START_HOUR && now.getHours() < END_HOUR && (
                  <div
                    ref={currentTimeRef}
                    className="absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: currentOffset }}
                  >
                    <div className="h-2 w-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-px bg-red-400" />
                  </div>
                )}

                {/* Appointments */}
                {doctorAppts.map((appt) => {
                  const top = timeToOffset(appt.start_time)
                  const bottom = timeToOffset(appt.end_time)
                  const height = Math.max(bottom - top, 24)
                  const patient = appt.patient as any
                  const service = appt.service as any
                  const colorClass = STATUS_COLORS[appt.status] ?? 'bg-gray-100 border-gray-300'

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onAppointmentClick(appt.id)}
                      aria-label={`${patient?.name ?? 'Appointment'} at ${formatTime(appt.start_time)}`}
                      className={`
                        absolute left-1 right-1 rounded border px-1.5 py-1 text-left overflow-hidden
                        transition-all hover:shadow-md hover:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                        ${colorClass}
                      `}
                      style={{ top, height }}
                    >
                      <p className="text-xs font-semibold truncate flex items-center gap-1">
                        {patient?.name ?? 'Patient'}
                        {patient?.is_vip && <Crown className="h-2.5 w-2.5 text-yellow-600 shrink-0" />}
                        {patient?.allergies && (
                          <AlertTriangle className="h-2.5 w-2.5 text-red-600 shrink-0" />
                        )}
                      </p>
                      {height > 36 && service?.name && (
                        <p className="text-xs truncate opacity-80">{service.name}</p>
                      )}
                      {height > 52 && (
                        <p className="text-xs opacity-70">
                          {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
