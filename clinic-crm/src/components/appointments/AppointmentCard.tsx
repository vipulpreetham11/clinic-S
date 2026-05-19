import { Crown, AlertTriangle, Phone } from 'lucide-react'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import type { AppointmentWithDetails } from '@/types'

interface AppointmentCardProps {
  appointment: AppointmentWithDetails
  onClick?: () => void
  compact?: boolean
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

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-500',
  admin: 'bg-blue-500',
  receptionist: 'bg-purple-500',
  website: 'bg-orange-500',
}

export function AppointmentCard({ appointment, onClick, compact = false }: AppointmentCardProps) {
  const patient = appointment.patient as any
  const service = appointment.service as any
  const doctor = appointment.doctor as any

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`
        rounded-lg border bg-card p-3 transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {patient?.name ? getInitials(patient.name) : '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm truncate">{patient?.name ?? 'Unknown'}</span>
              {patient?.is_vip && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
              {patient?.allergies && (
                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" aria-label="Has allergies" />
              )}
            </div>
            {!compact && patient?.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" />
                {patient.phone}
              </p>
            )}
          </div>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {formatTime(appointment.start_time)} — {formatTime(appointment.end_time)}
          </span>
          {appointment.source && (
            <span className={`h-2 w-2 rounded-full ${SOURCE_COLORS[appointment.source] ?? 'bg-gray-400'}`} title={appointment.source} />
          )}
        </div>
        {service?.name && (
          <p className="text-xs text-muted-foreground truncate">{service.name}</p>
        )}
        {!compact && doctor?.name && (
          <p className="text-xs text-muted-foreground">Dr. {doctor.name}</p>
        )}
      </div>
    </div>
  )
}
