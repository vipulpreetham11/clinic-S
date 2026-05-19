import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CalendarDays, Clock, Stethoscope, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EditServiceModal } from '@/components/services/AddServiceModal'
import { formatServiceDuration, formatServicePrice } from '@/components/services/ServiceCard'
import {
  useService,
  useServiceUpcomingAppointments,
  useToggleServiceStatus,
  useUpsertService,
} from '@/hooks/useServices'
import type { ServiceUpsertInput } from '@/types'

function formatAppointmentDateTime(date: string, time: string) {
  return format(new Date(`${date}T${time}`), 'EEE, d MMM • hh:mm a')
}

export default function ServiceDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { data: service, isLoading } = useService(id)
  const { data: appointments = [], isLoading: appointmentsLoading } =
    useServiceUpcomingAppointments(id)
  const upsertService = useUpsertService()
  const toggleServiceStatus = useToggleServiceStatus()

  async function handleUpdate(serviceId: string, values: ServiceUpsertInput) {
    await upsertService.mutateAsync({ ...values, id: serviceId })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <EmptyState
        title="Service not found"
        description="The selected service does not exist for this clinic."
        action={
          <Button variant="outline" onClick={() => navigate('/services')}>
            Back to Services
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={service.name}
        description="Service details and upcoming appointments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/services')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toggleServiceStatus.mutate({
                  id: service.id,
                  isActive: !service.is_active,
                })
              }
              disabled={toggleServiceStatus.isPending}
            >
              {service.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Service Information
            <Badge variant={service.is_active ? 'default' : 'outline'}>
              {service.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium">{service.category ?? 'Other'}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">
                {formatServiceDuration(service.duration_minutes)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-sm font-medium">{formatServicePrice(service.price)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {format(new Date(service.created_at), 'd MMM yyyy')}
              </p>
            </div>
          </div>

          {service.description ? (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{service.description}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Upcoming Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-10 w-10" />}
              title="No upcoming appointments"
              description="No future appointments are currently booked for this service."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{appointment.patient?.name ?? 'Unknown patient'}</p>
                      <Badge variant="outline" className="capitalize">
                        {appointment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatAppointmentDateTime(appointment.date, appointment.start_time)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5" />
                      Dr. {appointment.doctor?.name ?? 'Unknown'}
                    </p>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                        View Appointment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-36">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{appointment.patient?.name ?? 'Unknown patient'}</p>
                              <p className="text-xs text-muted-foreground">
                                {appointment.patient?.phone ?? 'No phone'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatAppointmentDateTime(appointment.date, appointment.start_time)}
                        </TableCell>
                        <TableCell>
                          {appointment.doctor?.name
                            ? `Dr. ${appointment.doctor.name}`
                            : 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {appointment.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/appointments/${appointment.id}`)}>
                            View Appointment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EditServiceModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        service={service}
        onSubmit={handleUpdate}
        isSubmitting={upsertService.isPending}
      />
    </div>
  )
}
