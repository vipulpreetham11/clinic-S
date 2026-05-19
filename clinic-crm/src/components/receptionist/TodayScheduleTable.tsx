import { Fragment, useMemo, useState } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReceptionistStatusBadge } from '@/components/receptionist/ReceptionistStatusBadge'
import { AppointmentRowActions } from '@/components/receptionist/AppointmentRowActions'
import { formatTime12h, getDurationMinutes } from '@/lib/formatTime'
import { isAppointmentOverdue } from '@/api/receptionistDashboard'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/types'

type TodayAppointment = {
  id: string
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  patient?: { name?: string; phone?: string } | null
  doctor?: { id?: string; name?: string } | null
  service?: { name?: string; duration_minutes?: number } | null
}

const STATUS_FILTERS: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending', label: 'Scheduled' },
  { value: 'confirmed', label: 'Checked In' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

interface TodayScheduleTableProps {
  appointments?: TodayAppointment[]
  doctors?: { id: string; name: string }[]
  isLoading?: boolean
  doctorFilter?: string[]
  onDoctorFilterChange?: (ids: string[]) => void
  onViewAppointment: (id: string) => void
}

export function TodayScheduleTable({
  appointments = [],
  doctors = [],
  isLoading,
  doctorFilter = [],
  onDoctorFilterChange,
  onViewAppointment,
}: TodayScheduleTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<AppointmentStatus[]>([])
  const [doctorSelect, setDoctorSelect] = useState<string>('')

  const effectiveDoctorFilter =
    doctorFilter.length > 0 ? doctorFilter : doctorSelect ? [doctorSelect] : []

  const filtered = useMemo(() => {
    let list = [...appointments]

    if (effectiveDoctorFilter.length > 0) {
      list = list.filter((a) => a.doctor?.id && effectiveDoctorFilter.includes(a.doctor.id))
    }

    if (statusFilters.length > 0) {
      list = list.filter((a) => statusFilters.includes(a.status))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.patient?.name?.toLowerCase().includes(q) ||
          a.patient?.phone?.includes(search.trim())
      )
    }

    return list.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [appointments, effectiveDoctorFilter, statusFilters, search])

  const nowStr = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`
  let nowIndex = filtered.findIndex((a) => a.start_time > nowStr)
  if (nowIndex === -1 && filtered.length > 0) nowIndex = filtered.length

  function toggleStatus(status: AppointmentStatus) {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  function handleDoctorSelect(value: string | null) {
    if (!value || value === 'all') {
      setDoctorSelect('')
      onDoctorFilterChange?.([])
    } else {
      setDoctorSelect(value)
      onDoctorFilterChange?.([value])
    }
  }

  const hasFilters = !!(search || statusFilters.length || effectiveDoctorFilter.length)

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b space-y-4 pb-4">
        <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patient name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={effectiveDoctorFilter[0] || 'all'} onValueChange={handleDoctorSelect}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="All doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  Dr. {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => {
                setSearch('')
                setStatusFilters([])
                setDoctorSelect('')
                onDoctorFilterChange?.([])
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {STATUS_FILTERS.map((s) => (
            <Badge
              key={s.value}
              variant={statusFilters.includes(s.value) ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(s.value)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No appointments match your filters.
          </p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="w-[80px]">Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right min-w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((apt, index) => {
                    const overdue = isAppointmentOverdue(apt.start_time, apt.status, apt.date)
                    const showNow = index === nowIndex

                    return (
                      <Fragment key={apt.id}>
                        {showNow && (
                          <TableRow className="hover:bg-transparent border-0">
                            <TableCell colSpan={7} className="py-2 px-4">
                              <NowLine />
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow
                          className={cn(
                            overdue && 'bg-red-50/80 dark:bg-red-950/20',
                            apt.status === 'cancelled' && 'opacity-60'
                          )}
                        >
                          <TableCell className="font-medium tabular-nums">
                            {formatTime12h(apt.start_time)}
                          </TableCell>
                          <TableCell>
                            <p
                              className={cn(
                                'font-medium',
                                apt.status === 'cancelled' && 'line-through'
                              )}
                            >
                              {apt.patient?.name || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">{apt.patient?.phone}</p>
                          </TableCell>
                          <TableCell className="text-sm">Dr. {apt.doctor?.name || '—'}</TableCell>
                          <TableCell className="text-sm">{apt.service?.name || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {apt.service?.duration_minutes ??
                              getDurationMinutes(apt.start_time, apt.end_time)}{' '}
                            min
                          </TableCell>
                          <TableCell>
                            <ReceptionistStatusBadge status={apt.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <AppointmentRowActions
                              appointmentId={apt.id}
                              status={apt.status}
                              onView={() => onViewAppointment(apt.id)}
                            />
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    )
                  })}
                  {nowIndex === filtered.length && filtered.length > 0 && (
                    <TableRow className="hover:bg-transparent border-0">
                      <TableCell colSpan={7} className="py-2 px-4">
                        <NowLine />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y">
              {filtered.map((apt, index) => {
                const overdue = isAppointmentOverdue(apt.start_time, apt.status, apt.date)
                const showNow = index === nowIndex

                return (
                  <Fragment key={apt.id}>
                    {showNow && (
                      <div className="px-4 py-2">
                        <NowLine />
                      </div>
                    )}
                    <div
                      className={cn(
                        'p-4 space-y-3',
                        overdue && 'bg-red-50/80',
                        apt.status === 'cancelled' && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{formatTime12h(apt.start_time)}</p>
                          <p className="font-medium">{apt.patient?.name}</p>
                          <p className="text-xs text-muted-foreground">{apt.patient?.phone}</p>
                        </div>
                        <ReceptionistStatusBadge status={apt.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Dr. {apt.doctor?.name} · {apt.service?.name}
                      </p>
                      <AppointmentRowActions
                        appointmentId={apt.id}
                        status={apt.status}
                        onView={() => onViewAppointment(apt.id)}
                      />
                    </div>
                  </Fragment>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function NowLine() {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded z-10">
        NOW
      </span>
      <div className="w-full border-t border-red-500 border-dashed" />
    </div>
  )
}
