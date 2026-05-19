import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'

interface DoctorStatusCardProps {
  doctors: any[]
}

export function DoctorStatusCard({ doctors }: DoctorStatusCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Doctors Today</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-4">
        {doctors.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No doctors found.
          </div>
        ) : (
          doctors.map((doc) => {
            // Determine status color
            let statusColor = 'bg-gray-400' // Default / not working
            let statusText = 'Not working today'

            if (!doc.is_active) {
              statusColor = 'bg-red-500'
              statusText = 'On Leave / Inactive'
            } else if (doc.isWorkingToday) {
              if (doc.totalTodayApts > 0) {
                statusColor = 'bg-green-500'
                statusText = 'Working • Has Appointments'
              } else {
                statusColor = 'bg-yellow-500'
                statusText = 'Working • No Appointments'
              }
            }

            const progress = doc.totalTodayApts > 0 
              ? (doc.completedApts / doc.totalTodayApts) * 100 
              : 0

            return (
              <div key={doc.id} className="p-3 border rounded-lg bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={doc.photo_url} />
                    <AvatarFallback>{doc.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-semibold text-sm truncate">Dr. {doc.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{doc.specialization || 'General'}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center text-xs gap-1.5 font-medium">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                    <span>{statusText}</span>
                  </div>
                  {doc.isWorkingToday && doc.is_active && (
                    <div className="text-xs text-muted-foreground ml-3.5">
                      {doc.arrival_time} — {doc.departure_time}
                    </div>
                  )}
                </div>

                {doc.isWorkingToday && doc.is_active && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Progress</span>
                      <span>{doc.completedApts}/{doc.totalTodayApts}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>{doc.completedApts} done</span>
                      <span>{doc.remainingApts} remaining</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
