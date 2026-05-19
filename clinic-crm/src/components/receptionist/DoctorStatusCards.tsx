import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatTime12h, getInitials } from '@/lib/formatTime'
import type { ReceptionistDoctorStatus } from '@/api/receptionistDashboard'

const STATUS_BORDER: Record<ReceptionistDoctorStatus['status'], string> = {
  available: 'border-l-emerald-500',
  with_patient: 'border-l-purple-500',
  break: 'border-l-amber-500',
  done: 'border-l-gray-400',
}

const STATUS_LABEL: Record<ReceptionistDoctorStatus['status'], string> = {
  available: 'Available',
  with_patient: 'With Patient',
  break: 'Break',
  done: 'Done for Day',
}

interface DoctorStatusCardsProps {
  doctors?: ReceptionistDoctorStatus[]
  isLoading?: boolean
  selectedDoctorId?: string | null
  onDoctorClick?: (doctorId: string) => void
}

export function DoctorStatusCards({
  doctors = [],
  isLoading,
  selectedDoctorId,
  onDoctorClick,
}: DoctorStatusCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (doctors.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No doctors on duty today.
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {doctors.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => onDoctorClick?.(doc.id)}
          className={cn(
            'text-left rounded-lg border bg-card p-4 border-l-4 transition-all hover:shadow-md',
            STATUS_BORDER[doc.status],
            selectedDoctorId === doc.id && 'ring-2 ring-primary ring-offset-2'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={doc.photo_url ?? undefined} alt={doc.name} />
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(doc.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">Dr. {doc.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {doc.specialization || 'General'}
              </p>
            </div>
          </div>

          <p className="text-xs font-medium mb-2">{STATUS_LABEL[doc.status]}</p>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Next:{' '}
              {doc.nextAppointmentTime
                ? formatTime12h(doc.nextAppointmentTime)
                : '—'}
            </p>
            <p>{doc.remainingAppointments} appointments remaining</p>
          </div>
        </button>
      ))}
    </div>
  )
}
