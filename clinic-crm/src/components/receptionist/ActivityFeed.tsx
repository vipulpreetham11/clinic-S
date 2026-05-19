import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  UserCheck,
  XCircle,
  UserPlus,
  FileText,
  Calendar,
  CheckCircle,
  UserX,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ActivityFeedItem } from '@/api/receptionistDashboard'

const TYPE_ICON: Record<ActivityFeedItem['type'], { icon: typeof UserCheck; color: string }> = {
  check_in: { icon: UserCheck, color: 'text-amber-600 bg-amber-100' },
  cancelled: { icon: XCircle, color: 'text-red-600 bg-red-100' },
  new_patient: { icon: UserPlus, color: 'text-purple-600 bg-purple-100' },
  invoice: { icon: FileText, color: 'text-blue-600 bg-blue-100' },
  booked: { icon: Calendar, color: 'text-emerald-600 bg-emerald-100' },
  completed: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  no_show: { icon: UserX, color: 'text-orange-600 bg-orange-100' },
}

interface ActivityFeedProps {
  items?: ActivityFeedItem[]
  isLoading?: boolean
}

export function ActivityFeed({ items = [], isLoading }: ActivityFeedProps) {
  return (
    <Card className="h-full flex flex-col lg:sticky lg:top-6">
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Live updates from your clinic</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 min-h-[280px] max-h-[600px]">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No recent activity.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const config = TYPE_ICON[item.type]
              const Icon = config.icon
              return (
                <li key={item.id} className="flex gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                      config.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}