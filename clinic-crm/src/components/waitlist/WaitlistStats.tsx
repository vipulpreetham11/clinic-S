import React from 'react'
import type { WaitlistEntry } from '../../types/waitlist'
import { Card, CardContent } from '../ui/card'
import { Clock, CheckCircle2, User, Stethoscope } from 'lucide-react'

interface WaitlistStatsProps {
  waitlist: WaitlistEntry[]
}

export function WaitlistStats({ waitlist }: WaitlistStatsProps) {
  if (!waitlist || waitlist.length === 0) return null

  const bookedEntries = waitlist.filter(w => w.status === 'booked')
  const waitingEntries = waitlist.filter(w => w.status === 'waiting')
  
  // Conversion Rate
  const conversionRate = Math.round((bookedEntries.length / (waitlist.length || 1)) * 100)

  // Most requested doctor
  const docCounts = waitlist.reduce((acc, curr) => {
    if (curr.doctors?.name) {
      acc[curr.doctors.name] = (acc[curr.doctors.name] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  const mostRequestedDoctor = Object.keys(docCounts).length > 0 
    ? Object.entries(docCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'None'

  // Most requested service
  const svcCounts = waitlist.reduce((acc, curr) => {
    if (curr.services?.name) {
      acc[curr.services.name] = (acc[curr.services.name] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  const mostRequestedService = Object.keys(svcCounts).length > 0
    ? Object.entries(svcCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'None'

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Currently Waiting</p>
            <p className="text-2xl font-bold">{waitingEntries.length}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-full">
            <User className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Top Doctor</p>
            <p className="text-lg font-bold truncate max-w-[150px]">{mostRequestedDoctor}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-full">
            <Stethoscope className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Top Service</p>
            <p className="text-lg font-bold truncate max-w-[150px]">{mostRequestedService}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
