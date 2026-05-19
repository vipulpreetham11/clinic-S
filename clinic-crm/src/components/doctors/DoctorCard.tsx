import { useMemo } from 'react'
import { Calendar, Clock, Timer } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DoctorAvatar } from '@/components/doctors/DoctorAvatar'
import { cn } from '@/lib/utils'
import type { Doctor } from '@/api/doctors'
import { useDoctorAppointmentCount, useDoctorStats } from '@/hooks/useDoctors'
import { format } from 'date-fns'

interface DoctorCardProps {
  doctor: Doctor
  onViewSchedule?: () => void
  onEdit?: () => void
  readOnly?: boolean
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

export function DoctorCard({ doctor, onViewSchedule, onEdit, readOnly }: DoctorCardProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = format(new Date(), 'yyyy-MM-01')
  const monthEnd = format(new Date(), 'yyyy-MM-31')

  const { data: todayStats } = useDoctorStats(doctor.id, today, today)
  const { data: monthStats } = useDoctorStats(doctor.id, monthStart, monthEnd)
  const { data: totalCount } = useDoctorAppointmentCount(doctor.id)

  const services = doctor.services ?? []
  const serviceLabels = services.slice(0, 2)
  const extraCount = Math.max(services.length - 2, 0)

  const dayLabel = useMemo(() => {
    if (!doctor.working_days?.length) return 'No days set'
    if (doctor.working_days.length === 7) return 'Mon - Sun'
    return doctor.working_days.join(', ')
  }, [doctor.working_days])

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <DoctorAvatar doctor={doctor} size="lg" />
          <div>
            <p className="text-base font-semibold">Dr. {doctor.name}</p>
            <p className="text-xs text-muted-foreground">{doctor.specialization ?? 'General Practice'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Today</p>
            <p className="text-sm font-semibold">{todayStats?.total ?? '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Month</p>
            <p className="text-sm font-semibold">{monthStats?.total ?? '--'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{totalCount ?? '--'}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{formatTime(doctor.arrival_time)} - {formatTime(doctor.departure_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{dayLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            <span>{doctor.slot_duration} min slots</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {serviceLabels.map((svc) => (
              <Badge key={svc.id} variant="outline">{svc.name}</Badge>
            ))}
            {extraCount > 0 && <Badge variant="secondary">+{extraCount}</Badge>}
            {services.length === 0 && <span className="text-xs text-muted-foreground">No services</span>}
          </div>
        </div>
      </CardContent>
      <CardFooter className={cn('gap-2', readOnly && 'justify-end')}>
        <Button variant="outline" size="sm" onClick={onViewSchedule}>View Schedule</Button>
        {!readOnly && <Button size="sm" onClick={onEdit}>Edit</Button>}
      </CardFooter>
    </Card>
  )
}
