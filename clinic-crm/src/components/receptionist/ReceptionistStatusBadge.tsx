import { Badge } from '@/components/ui/badge'
import type { AppointmentStatus } from '@/types'

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  confirmed: {
    label: 'Checked In',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  rescheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
}

interface ReceptionistStatusBadgeProps {
  status: AppointmentStatus
  className?: string
}

export function ReceptionistStatusBadge({ status, className }: ReceptionistStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  }

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className ?? ''} font-medium text-xs whitespace-nowrap`}
    >
      {config.label}
    </Badge>
  )
}
