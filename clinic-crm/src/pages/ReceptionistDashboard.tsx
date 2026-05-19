import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthContext } from '@/context/AuthContext'
import { useReceptionistDashboard } from '@/hooks/useReceptionistDashboard'
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments'
import { KPIStrip } from '@/components/receptionist/KPIStrip'
import { QuickActionsBar } from '@/components/receptionist/QuickActionsBar'
import { TodayScheduleTable } from '@/components/receptionist/TodayScheduleTable'
import { DoctorStatusCards } from '@/components/receptionist/DoctorStatusCards'
import { ActivityFeed } from '@/components/receptionist/ActivityFeed'
import { AppointmentDetailDrawer } from '@/components/receptionist/AppointmentDetailDrawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ReceptionistDashboard() {
  const navigate = useNavigate()
  const { profile, clinic } = useAuthContext()
  const { stats, appointments, doctors, activity, isLoading } = useReceptionistDashboard()

  useRealtimeAppointments()

  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [doctorFilter, setDoctorFilter] = useState<string[]>([])
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key.toLowerCase() === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        navigate(`/appointments/new?date=${format(new Date(), 'yyyy-MM-dd')}`)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const appointmentList = (appointments.data || []) as Parameters<
    typeof TodayScheduleTable
  >[0]['appointments']

  const doctorOptions = (doctors.data || []).map((d) => ({ id: d.id, name: d.name }))

  function handleDoctorClick(doctorId: string) {
    setDoctorFilter((prev) => (prev.includes(doctorId) ? [] : [doctorId]))
  }

  if (isLoading && !stats.data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {getGreeting()}, {profile?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          {clinic?.name} ·{' '}
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      <KPIStrip stats={stats.data} isLoading={stats.isLoading} />

      <QuickActionsBar onWaitlist={() => setWaitlistOpen(true)} />

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Doctors on duty
        </h2>
        <DoctorStatusCards
          doctors={doctors.data}
          isLoading={doctors.isLoading}
          selectedDoctorId={doctorFilter[0] ?? null}
          onDoctorClick={handleDoctorClick}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 min-w-0">
          <TodayScheduleTable
            appointments={appointmentList}
            doctors={doctorOptions}
            isLoading={appointments.isLoading}
            doctorFilter={doctorFilter}
            onDoctorFilterChange={setDoctorFilter}
            onViewAppointment={setSelectedAppointmentId}
          />
        </div>
        <div className="xl:col-span-1">
          <ActivityFeed items={activity.data} isLoading={activity.isLoading} />
        </div>
      </div>

      <AppointmentDetailDrawer
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
      />

      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waitlist</DialogTitle>
            <DialogDescription>
              Waitlist management is coming soon. Use the Waitlist page for full features.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

    </div>
  )
}