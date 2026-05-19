import { Calendar, CheckCircle2, Clock, Users, MessageCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface QuickStatsProps {
  stats: {
    total: number
    confirmed: number
    completed: number
    cancelled: number
    no_show: number
    new_patients: number
    waitlist: number
    pending_reminders: number
    active_conversations: number
  }
}

export function QuickStats({ stats }: QuickStatsProps) {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const remaining = stats.total - stats.completed - stats.cancelled - stats.no_show

  const cards = [
    {
      label: 'Total Today',
      value: stats.total,
      subtext: 'appointments today',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      link: '/appointments?date=today',
    },
    {
      label: 'Completed',
      value: stats.completed,
      subtext: `${completionRate}% completion rate`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      link: '/appointments?status=completed',
    },
    {
      label: 'Remaining',
      value: remaining,
      subtext: 'appointments left',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      link: '/appointments?date=today',
    },
    {
      label: 'New Patients',
      value: stats.new_patients,
      subtext: 'registered today',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      link: '/patients',
    },
    {
      label: 'WhatsApp Chats',
      value: stats.active_conversations,
      subtext: 'active conversations',
      icon: MessageCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      link: '/conversations',
      showDot: stats.active_conversations > 0,
    },
    {
      label: 'Waitlist',
      value: stats.waitlist,
      subtext: 'patients waiting',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      link: '/waitlist',
      showBadge: stats.waitlist > 0,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <Link key={i} to={card.link}>
          <Card className="p-6 flex items-center gap-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
            <div className={cn('p-3 rounded-2xl relative', card.bgColor, card.color)}>
              <card.icon className="w-6 h-6" />
              {card.showDot && (
                <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            <div className="flex-1 relative">
              <div className="text-3xl font-bold flex items-center gap-2">
                {card.value}
                {card.showBadge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Action needed
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.subtext}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
