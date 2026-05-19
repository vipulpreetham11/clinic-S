import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/types'

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
  className?: string
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800 border-red-200' },
  no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  rescheduled: { label: 'Rescheduled', className: 'bg-purple-100 text-purple-800 border-purple-200' },
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className ?? ''} font-medium text-xs`}
    >
      {config.label}
    </Badge>
  )
}
