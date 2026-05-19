import { Calendar, UserCheck, Clock, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReceptionistTodayStats } from '@/api/receptionistDashboard'

interface KPIStripProps {
  stats?: ReceptionistTodayStats
  isLoading?: boolean
}

export function KPIStrip({ stats, isLoading }: KPIStripProps) {
  const cards = [
    {
      label: "Today's Appointments",
      value: stats?.total_appointments ?? 0,
      sub: stats
        ? `${stats.completed} completed / ${stats.remaining} remaining`
        : '—',
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      label: 'Checked In',
      value: stats?.checked_in ?? 0,
      sub: 'currently in clinic',
      icon: UserCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
    },
    {
      label: 'Available Slots',
      value: stats?.available_slots ?? 0,
      sub: 'across all doctors today',
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
    {
      label: 'New Patients Today',
      value: stats?.new_patients ?? 0,
      sub: 'registered today',
      icon: UserPlus,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-16 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className="p-5 flex items-center gap-4 border-l-4"
            style={{ borderLeftColor: 'hsl(var(--primary))' }}
          >
            <div className={cn('p-3 rounded-2xl', card.bg, card.color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold tabular-nums">{card.value}</p>
              <p className="text-sm font-medium truncate">{card.label}</p>
              <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
