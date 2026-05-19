import { Calendar as CalendarIcon, User as UserIcon, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface TodayScheduleProps {
  appointments: any[]
}

const statusColors: Record<string, string> = {
  confirmed: 'border-blue-500 bg-blue-50 dark:bg-blue-900/10',
  completed: 'border-green-500 bg-green-50 dark:bg-green-900/10',
  pending: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
  cancelled: 'border-red-500 bg-red-50 dark:bg-red-900/10 opacity-70',
  no_show: 'border-gray-500 bg-gray-50 dark:bg-gray-900/10 opacity-70',
}

const sourceIcons: Record<string, string> = {
  whatsapp: '📱 WhatsApp',
  admin: '👤 Admin',
  website: '🌐 Website',
  receptionist: '🎧 Receptionist',
}

function formatTime(timeStr: string) {
  try {
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(h, 10), parseInt(m, 10))
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return timeStr
  }
}

function getDuration(start: string, end: string) {
  try {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return `${diff}min`
  } catch {
    return ''
  }
}

export function TodaySchedule({ appointments }: TodayScheduleProps) {
  const navigate = useNavigate()

  // Find where to place the "Now" line
  const now = new Date()
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  let nowIndex = appointments.findIndex((apt) => apt.start_time > currentTimeStr)
  if (nowIndex === -1 && appointments.length > 0) nowIndex = appointments.length // Append at the end if all are past

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/appointments/new')}>
          <Plus className="w-4 h-4 mr-1" /> Book Appointment
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground space-y-4">
            <CalendarIcon className="w-16 h-16 opacity-20" />
            <p>No appointments scheduled for today.</p>
            <Button variant="outline" onClick={() => navigate('/appointments/new')}>
              Book First Appointment
            </Button>
          </div>
        ) : (
          <div className="flex flex-col p-4 relative">
            {appointments.map((apt, index) => {
              const showNowLine = index === nowIndex

              return (
                <div key={apt.id} className="relative">
                  {showNowLine && (
                    <div className="relative flex items-center my-4">
                      <div className="absolute left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10 -ml-2">
                        NOW
                      </div>
                      <div className="w-full border-t border-red-500 border-dashed"></div>
                    </div>
                  )}
                  <div
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                    className={cn(
                      'flex items-stretch border-l-4 rounded-r-md p-3 mb-3 cursor-pointer hover:shadow-sm transition-shadow',
                      statusColors[apt.status] || 'border-gray-200'
                    )}
                  >
                    <div className="w-20 shrink-0 border-r pr-3 mr-3 flex flex-col justify-center text-center">
                      <span className="font-semibold text-sm">{formatTime(apt.start_time)}</span>
                      <span className="text-xs text-muted-foreground">{getDuration(apt.start_time, apt.end_time)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={cn("font-medium", apt.status === 'cancelled' && 'line-through opacity-70')}>
                          👤 {apt.patient?.name || 'Unknown Patient'}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 border capitalize font-medium">
                          {apt.status === 'completed' ? '✅ ' : ''}{apt.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {apt.service?.name || 'Consultation'}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground gap-3">
                        <span>Dr. {apt.doctor?.name || 'Unassigned'}</span>
                        <span>•</span>
                        <span>{sourceIcons[apt.source] || apt.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Show "Now" line at the very bottom if all appointments are in the past */}
            {nowIndex === appointments.length && (
              <div className="relative flex items-center mt-4">
                <div className="absolute left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm z-10 -ml-2">
                  NOW
                </div>
                <div className="w-full border-t border-red-500 border-dashed"></div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
