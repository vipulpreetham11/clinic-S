import { MessageCircle, User, Globe, Headset, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

interface RecentActivityProps {
  activity: any[]
}

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'whatsapp':
      return <MessageCircle className="w-4 h-4 text-green-500" />
    case 'admin':
      return <User className="w-4 h-4 text-blue-500" />
    case 'website':
      return <Globe className="w-4 h-4 text-purple-500" />
    case 'receptionist':
      return <Headset className="w-4 h-4 text-orange-500" />
    default:
      return <User className="w-4 h-4 text-gray-500" />
  }
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export function RecentActivity({ activity }: RecentActivityProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {activity.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No recent activity found.
          </div>
        ) : (
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                <div className="mt-1 p-2 rounded-full bg-muted">
                  {getSourceIcon(item.source)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{item.patient?.name || 'Unknown Patient'}</span> booked{' '}
                    <span className="font-medium">{item.service?.name || 'a service'}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
