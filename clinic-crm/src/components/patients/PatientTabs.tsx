import { useState } from 'react'
import { format, parseISO, isPast } from 'date-fns'
import { Calendar, FileText, Receipt, Clock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAppointments } from '@/hooks/useAppointments'
import type { AppointmentWithDetails, AppointmentStatus } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

interface PatientTabsProps {
  patientId: string
}

export function PatientTabs({ patientId }: PatientTabsProps) {
  const [activeTab, setActiveTab] = useState('appointments')
  const { data: { data: appointments = [] } = {}, isLoading } = useAppointments({ patientId, limit: 100 })

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
      case 'no_show': return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">No Show</Badge>
      case 'confirmed': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Confirmed</Badge>
      case 'rescheduled': return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Rescheduled</Badge>
      default: return <Badge variant="outline">Scheduled</Badge>
    }
  }

  // Sort appointments: upcoming first (earliest to latest), then past (latest to earliest)
  const upcomingAppointments = appointments
    .filter((a) => !isPast(parseISO(`${a.date}T${a.start_time}`)))
    .sort((a, b) => parseISO(`${a.date}T${a.start_time}`).getTime() - parseISO(`${b.date}T${b.start_time}`).getTime())
  
  const pastAppointments = appointments
    .filter((a) => isPast(parseISO(`${a.date}T${a.start_time}`)))
    .sort((a, b) => parseISO(`${b.date}T${b.start_time}`).getTime() - parseISO(`${a.date}T${a.start_time}`).getTime())

  const sortedAppointments = [...upcomingAppointments, ...pastAppointments]

  // Extract medical notes from completed appointments
  const medicalNotes = appointments
    .filter((a) => a.status === 'completed' && a.notes)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="appointments">
          <Calendar className="mr-2 h-4 w-4" /> Appointments
        </TabsTrigger>
        <TabsTrigger value="notes">
          <FileText className="mr-2 h-4 w-4" /> Medical Notes
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <Receipt className="mr-2 h-4 w-4" /> Invoices
        </TabsTrigger>
      </TabsList>

      <TabsContent value="appointments" className="mt-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : sortedAppointments.length > 0 ? (
          <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
            {sortedAppointments.map((apt: any) => (
              <div key={apt.id} className="relative pl-6">
                <div className="absolute w-3 h-3 bg-primary rounded-full -left-[6.5px] top-2 border-2 border-background" />
                <Card>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-base">
                          {format(parseISO(apt.date), 'dd MMM yyyy')}
                        </h4>
                        {getStatusBadge(apt.status)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {apt.start_time.substring(0, 5)}
                        </span>
                        <span>• Dr. {apt.doctor?.name || 'Unknown'}</span>
                        {apt.service?.name && <span>• {apt.service.name}</span>}
                      </div>
                      {apt.notes && (
                        <p className="mt-3 text-sm text-muted-foreground border-l-2 pl-3 italic">
                          "{apt.notes}"
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <Calendar className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <p className="font-medium">No appointments found</p>
            <p className="text-sm text-muted-foreground mt-1">This patient hasn't booked any visits yet.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : medicalNotes.length > 0 ? (
          <div className="space-y-4">
            {medicalNotes.map((apt: any) => (
              <Card key={`note-${apt.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2 border-b pb-2">
                    <div>
                      <h4 className="font-semibold">{format(parseISO(apt.date), 'dd MMM yyyy')}</h4>
                      <p className="text-xs text-muted-foreground">Dr. {apt.doctor?.name || 'Unknown'} • {apt.service?.name}</p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{apt.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed bg-muted/30">
            <Info className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <p className="font-medium">No medical notes</p>
            <p className="text-sm text-muted-foreground mt-1">Notes from completed appointments will appear here.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="invoices" className="mt-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold text-lg">Invoices</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-4 max-w-sm">
              Billing and invoice history will be available here soon.
            </p>
            <Button variant="outline" disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
