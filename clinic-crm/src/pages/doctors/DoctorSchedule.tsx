import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addYears } from 'date-fns'
import { ArrowLeft, AlertTriangle, Ban, Shield } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAuthContext } from '@/context/AuthContext'
import { DoctorScheduleCalendar } from '@/components/doctors/DoctorScheduleCalendar'
import { LeaveManager } from '@/components/doctors/LeaveManager'
import { BreakManager } from '@/components/doctors/BreakManager'
import { useDoctor, useDoctorAppointmentsByDate, useDoctorStats, useToggleDoctorStatus, useDeleteDoctor } from '@/hooks/useDoctors'
import * as doctorsApi from '@/api/doctors'

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function DoctorSchedule() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { clinic, isRole } = useAuthContext()
  const [tab, setTab] = useState('overview')
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [futureAppointments, setFutureAppointments] = useState<any[]>([])
  const [checkingFuture, setCheckingFuture] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null)

  const toggleStatus = useToggleDoctorStatus()
  const deleteDoctor = useDeleteDoctor()

  const { data: doctor, isLoading } = useDoctor(id)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: todayStats } = useDoctorStats(id || '', todayStr, todayStr)
  const { data: weekStats } = useDoctorStats(id || '', weekStart, weekEnd)
  const { data: monthStats } = useDoctorStats(id || '', monthStart, monthEnd)
  const { data: todayAppointments = [] } = useDoctorAppointmentsByDate(id || '', todayStr)

  const completionRate = useMemo(() => {
    if (!monthStats?.total) return 0
    return Math.round((monthStats.completed / monthStats.total) * 100)
  }, [monthStats])

  const noShowRate = useMemo(() => {
    if (!monthStats?.total) return 0
    return Math.round((monthStats.no_show / monthStats.total) * 100)
  }, [monthStats])

  const timelineItems = useMemo(() => {
    const appts = todayAppointments.map((appt: any) => ({
      type: 'appointment',
      start_time: appt.start_time,
      end_time: appt.end_time,
      label: `${appt.patient?.name ?? 'Patient'} - ${appt.service?.name ?? 'Service'}`,
      status: appt.status,
      id: appt.id,
    }))

    const breaks = (doctor?.breaks ?? []).map((b) => ({
      type: 'break',
      start_time: b.start_time,
      end_time: b.end_time,
      label: b.label,
      id: undefined,
      status: undefined,
    }))

    return [...appts, ...breaks].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
  }, [todayAppointments, doctor])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="space-y-4">
        <PageHeader title="Doctor Schedule" description="Doctor not found" />
        <Button variant="outline" onClick={() => navigate('/doctors')}>Back to Doctors</Button>
      </div>
    )
  }

  async function openDeactivateDialog() {
    if (!doctor) return
    setDeactivateOpen(true)
    setConfirmDeactivate(false)
    setCheckingFuture(true)
    try {
      const futureEnd = format(addYears(new Date(), 1), 'yyyy-MM-dd')
      const data = await doctorsApi.getDoctorAppointmentsInRange(doctor.id, todayStr, futureEnd)
      setFutureAppointments(data)
    } finally {
      setCheckingFuture(false)
    }
  }

  async function confirmDeactivateDoctor() {
    if (!doctor) return
    await toggleStatus.mutateAsync({ id: doctor.id, isActive: false })
    setDeactivateOpen(false)
  }

  async function toggleActive(next: boolean) {
    if (!doctor) return
    if (next) {
      await toggleStatus.mutateAsync({ id: doctor.id, isActive: true })
    } else {
      await openDeactivateDialog()
    }
  }

  async function handleDeleteDoctor() {
    if (!doctor) return
    try {
      const count = await doctorsApi.getDoctorAppointmentCount(doctor.id)
      if (count > 0) {
        setDeleteBlockedReason(`Cannot delete — ${doctor.name} has ${count} appointments in history. Deactivate instead.`)
        return
      }
      setDeleteOpen(true)
    } catch (error: any) {
      setDeleteBlockedReason(error?.message ?? 'Unable to check appointment history.')
    }
  }

  async function confirmDeleteDoctor() {
    if (!doctor) return
    await deleteDoctor.mutateAsync(doctor.id)
    navigate('/doctors')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dr. ${doctor.name}`}
        description={`${doctor.specialization ?? 'General Practice'} - ${doctor.is_active ? 'Active' : 'Inactive'}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/doctors')} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Doctors
            </Button>
            {isRole('admin', 'clinic_admin') && (
              <Button size="sm" onClick={() => navigate(`/doctors/${doctor.id}`)}>Edit Info</Button>
            )}
            {isRole('receptionist') && <Badge variant="outline">View Only</Badge>}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Working Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">{doctor.working_days?.join(', ') || 'No working days set'}</p>
                  <p className="text-xs text-muted-foreground">{doctor.arrival_time} - {doctor.departure_time}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Breaks</p>
                    {isRole('admin', 'clinic_admin') && (
                      <Button size="sm" variant="outline" onClick={() => setTab('settings')}>Edit Breaks</Button>
                    )}
                  </div>
                  {doctor.breaks?.length ? (
                    <div className="space-y-1">
                      {doctor.breaks.map((b) => (
                        <div key={b.id} className="text-xs text-muted-foreground">
                          {b.label}: {b.start_time} - {b.end_time}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No breaks configured.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">Capacity</p>
                  <p className="text-xs text-muted-foreground">{doctor.slot_duration} min per slot</p>
                  <p className="text-xs text-muted-foreground">Max {doctor.max_appointments_per_day} per day</p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Services</p>
                    {isRole('admin', 'clinic_admin') && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/doctors/${doctor.id}`)}>
                        Edit Services
                      </Button>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {(doctor.services ?? []).map((svc) => (
                      <li key={svc.id}>- {svc.name}</li>
                    ))}
                    {(doctor.services ?? []).length === 0 && <li>No services assigned.</li>}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium">Portal Access</p>
                  {doctor.user ? (
                    <div className="text-xs text-muted-foreground">
                      <p>Active login</p>
                      <p>{doctor.user.email}</p>
                      {doctor.user.last_login && <p>Last login: {format(new Date(doctor.user.last_login), 'PPp')}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No portal access</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="text-lg font-semibold">{todayStats?.total ?? '--'} / {doctor.max_appointments_per_day}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="text-lg font-semibold">{weekStats?.total ?? '--'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">This Month</p>
                    <p className="text-lg font-semibold">{monthStats?.total ?? '--'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                    <p className="text-lg font-semibold">{completionRate}%</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Today's Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {timelineItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No appointments today.</p>
                  ) : (
                    timelineItems.map((item, idx) => (
                      <button
                        key={`${item.type}-${idx}`}
                        type="button"
                        onClick={() => item.type === 'appointment' && navigate(`/appointments/${item.id}`)}
                        className="flex w-full items-start gap-3 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted/50"
                        aria-label={item.type === 'appointment' ? `Open appointment ${item.label}` : undefined}
                      >
                        <div className="text-xs text-muted-foreground w-16">{item.start_time}</div>
                        <div className="flex-1">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.start_time} - {item.end_time}</p>
                        </div>
                        {item.type === 'appointment' && (
                          <Badge variant="outline">{item.status}</Badge>
                        )}
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground">No-show rate this month: {noShowRate}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <DoctorScheduleCalendar doctor={doctor} />
        </TabsContent>

        <TabsContent value="leaves">
          {clinic?.id && (
            <LeaveManager doctorId={doctor.id} clinicId={clinic.id} readOnly={!isRole('admin', 'clinic_admin')} />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakManager
                  doctorId={doctor.id}
                  breaks={doctor.breaks ?? []}
                  arrivalTime={doctor.arrival_time}
                  departureTime={doctor.departure_time}
                  readOnly={!isRole('admin', 'clinic_admin')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Active Status</p>
                    <p className="text-xs text-muted-foreground">Inactive doctors are hidden from booking.</p>
                  </div>
                  <Switch
                    checked={doctor.is_active}
                    onCheckedChange={toggleActive}
                    disabled={!isRole('admin', 'clinic_admin')}
                  />
                </div>
              </CardContent>
            </Card>

            {isRole('admin', 'clinic_admin') && (
              <Card>
                <CardHeader>
                  <CardTitle>Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" onClick={openDeactivateDialog} className="gap-2">
                    <Ban className="h-4 w-4" />
                    Deactivate Doctor
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteDoctor} className="gap-2">
                    <Shield className="h-4 w-4" />
                    Delete Doctor
                  </Button>
                  {deleteBlockedReason && (
                    <p className="text-xs text-destructive">{deleteBlockedReason}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Doctor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {checkingFuture ? 'Checking future appointments...' : `${futureAppointments.length} future appointments exist.`}
            </p>
            {futureAppointments.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border p-2 text-xs">
                {futureAppointments.map((appt: any) => (
                  <div key={appt.id} className="flex items-center justify-between py-1">
                    <span>{appt.date} {appt.start_time}</span>
                    <span className="text-muted-foreground">{appt.patient?.name ?? 'Patient'}</span>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={confirmDeactivate} onCheckedChange={(val) => setConfirmDeactivate(!!val)} />
              I understand, deactivate anyway
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeactivateDoctor} disabled={!confirmDeactivate}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Doctor"
        description="This action cannot be undone. This will permanently delete the doctor profile."
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDeleteDoctor}
      />
    </div>
  )
}
