import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Plus, Download, Printer, LayoutList, Calendar,
  Search, X, ChevronLeft, ChevronRight,
  Globe, Headphones, MessageCircle, User as UserIcon,
  Crown, AlertTriangle, MoreHorizontal,
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { useAuthContext } from '@/context/AuthContext'
import { useAppointments, useUpdateAppointmentStatus } from '@/hooks/useAppointments'
import { useDoctors } from '@/hooks/useDoctors'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppointmentStatusBadge } from '@/components/appointments/AppointmentStatusBadge'
import { WaitlistNotificationBanner } from '@/components/waitlist/WaitlistNotificationBanner'
import { TimelineView } from '@/components/appointments/TimelineView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AppointmentStatus, AppointmentSource, AppointmentWithDetails, Doctor } from '@/types'

type DateTab = 'today' | 'tomorrow' | 'week' | 'month' | 'custom'
type ViewMode = 'table' | 'timeline'

function formatDateHeader(date: Date) {
  return format(date, 'EEE, d MMM')
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-3.5 w-3.5 text-green-600" />,
  admin: <UserIcon className="h-3.5 w-3.5 text-blue-600" />,
  receptionist: <Headphones className="h-3.5 w-3.5 text-purple-600" />,
  website: <Globe className="h-3.5 w-3.5 text-orange-500" />,
}

const PAGE_SIZE = 20

export default function AppointmentList() {
  const navigate = useNavigate()
  const { isAdmin, isRole, clinic } = useAuthContext()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [dateTab, setDateTab] = useState<DateTab>('today')
  const [customDate, setCustomDate] = useState<Date | undefined>()
  const [customDateOpen, setCustomDateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [doctorFilter, setDoctorFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statFilter, setStatFilter] = useState<string>('all')
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: doctors = [] } = useDoctors()

  const dateRange = useMemo(() => {
    const d = new Date()
    switch (dateTab) {
      case 'today': return { date: today }
      case 'tomorrow': return { date: format(addDays(d, 1), 'yyyy-MM-dd') }
      case 'week': return { dateFrom: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), dateTo: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
      case 'month': return { dateFrom: format(startOfMonth(d), 'yyyy-MM-dd'), dateTo: format(endOfMonth(d), 'yyyy-MM-dd') }
      case 'custom': return customDate ? { date: format(customDate, 'yyyy-MM-dd') } : { date: today }
      default: return { date: today }
    }
  }, [dateTab, customDate, today])

  const filters = {
    ...dateRange,
    doctorId: doctorFilter || undefined,
    status: (statFilter !== 'all' ? statFilter : statusFilter) as AppointmentStatus | undefined,
    source: sourceFilter as AppointmentSource | undefined,
    page,
    limit: PAGE_SIZE,
  }

  const { data, isLoading } = useAppointments(filters)
  const appointments = (data?.data ?? []) as AppointmentWithDetails[]
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const updateStatus = useUpdateAppointmentStatus()

  const filteredBySearch = search.trim()
    ? appointments.filter((a) => {
        const p = a.patient as any
        return (
          p?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p?.phone?.includes(search)
        )
      })
    : appointments

  const hasFilters = !!(doctorFilter || statusFilter || sourceFilter || search)

  function clearFilters() {
    setDoctorFilter('')
    setStatusFilter('')
    setSourceFilter('')
    setSearch('')
    setStatFilter('all')
    setPage(1)
  }

  function openDetail(id: string) {
    setSelectedId(id)
    navigate(`/appointments/${id}`)
  }

  function handleStatusAction(id: string, status: AppointmentStatus) {
    if (status === 'cancelled') {
      setCancelId(id)
    } else {
      updateStatus.mutate({ id, status })
    }
  }

  const statCounts = useMemo(() => {
    const all = appointments
    return {
      all: totalCount,
      confirmed: all.filter((a) => a.status === 'confirmed').length,
      completed: all.filter((a) => a.status === 'completed').length,
      pending: all.filter((a) => a.status === 'pending').length,
      no_show: all.filter((a) => a.status === 'no_show').length,
      cancelled: all.filter((a) => a.status === 'cancelled').length,
    }
  }, [appointments, totalCount])

  const fromItem = (page - 1) * PAGE_SIZE + 1
  const toItem = Math.min(page * PAGE_SIZE, totalCount)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        description="Manage daily schedule and bookings"
        action={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            {isRole('admin', 'receptionist') && (
              <Link to="/appointments/new">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Booking
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <WaitlistNotificationBanner />

      {/* Stats bar */}
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All', statCounts.all],
          ['confirmed', 'Confirmed', statCounts.confirmed],
          ['completed', 'Completed', statCounts.completed],
          ['pending', 'Pending', statCounts.pending],
          ['no_show', 'No-show', statCounts.no_show],
          ['cancelled', 'Cancelled', statCounts.cancelled],
        ] as [string, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatFilter(key); setPage(1) }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all
              ${statFilter === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${statFilter === key ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Date tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Tabs value={dateTab} onValueChange={(v) => { setDateTab(v as DateTab); setPage(1) }}>
          <TabsList className="h-8">
            <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
            <TabsTrigger value="tomorrow" className="text-xs">Tomorrow</TabsTrigger>
            <TabsTrigger value="week" className="text-xs">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs">This Month</TabsTrigger>
            <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
              <PopoverTrigger render={
                <TabsTrigger
                  value="custom"
                  className="text-xs"
                  onClick={() => setCustomDateOpen(true)}
                >
                  {customDate && dateTab === 'custom'
                    ? format(customDate, 'd MMM')
                    : 'Custom'}
                </TabsTrigger>
              } />
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={customDate}
                  onSelect={(d) => {
                    setCustomDate(d)
                    setDateTab('custom')
                    setCustomDateOpen(false)
                    setPage(1)
                  }}
                />
              </PopoverContent>
            </Popover>
          </TabsList>
        </Tabs>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors
              ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            aria-pressed={viewMode === 'table'}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors
              ${viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            aria-pressed={viewMode === 'timeline'}
          >
            <Calendar className="h-3.5 w-3.5" />
            Timeline
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {!isLoading && doctors.length > 0 && (
          <Select value={doctorFilter} onValueChange={(v) => { setDoctorFilter((v === 'all' ? '' : v) || ''); setPage(1) }}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All Doctors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter((v === 'all' ? '' : v) || ''); setStatFilter('all'); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
            <SelectItem value="rescheduled">Rescheduled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter((v === 'all' ? '' : v) || ''); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="website">Website</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search patient..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="h-8 pl-8 text-xs"
            aria-label="Search appointments"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'timeline' ? (
        isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <TimelineView
            appointments={filteredBySearch}
            doctors={doctors as Doctor[]}
            onAppointmentClick={(id) => navigate(`/appointments/${id}`)}
          />
        )
      ) : (
        <>
          <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Patient</TableHead>
                  <TableHead className="text-xs">Doctor</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Service</TableHead>
                  <TableHead className="text-xs">Date & Time</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Source</TableHead>
                  <TableHead className="text-xs w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredBySearch.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12">
                      <EmptyState
                        icon={<Calendar className="h-10 w-10" />}
                        title={hasFilters ? 'No appointments found' : 'No appointments scheduled'}
                        description={
                          hasFilters
                            ? 'Try adjusting your filters or search terms.'
                            : 'Book an appointment to get started.'
                        }
                        action={
                          hasFilters ? (
                            <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                          ) : isRole('admin', 'receptionist') ? (
                            <Link to="/appointments/new">
                              <Button size="sm">
                                <Plus className="mr-1 h-3.5 w-3.5" />New Booking
                              </Button>
                            </Link>
                          ) : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBySearch.map((appt, idx) => {
                    const patient = ((appt as any).patients ?? appt.patient) as any
                    const doctor = ((appt as any).doctors ?? appt.doctor) as any
                    const service = ((appt as any).services ?? appt.service) as any
                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1

                    return (
                      <TableRow key={appt.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-xs text-muted-foreground">{rowNum}</TableCell>

                        {/* Patient */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {patient?.name ? getInitials(patient.name) : '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">{patient?.name ?? '—'}</span>
                                {patient?.is_vip && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                                {patient?.allergies && (
                                  <span title="Has allergies">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{patient?.phone ?? ''}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Doctor */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                              {doctor?.name ? getInitials(doctor.name) : '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{doctor?.name ? `Dr. ${doctor.name}` : '—'}</p>
                              {doctor?.specialization && (
                                <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Service */}
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <p className="text-sm">{service?.name ?? '—'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {service?.duration_minutes && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">{service.duration_minutes} min</Badge>
                              )}
                              {isAdmin && service?.price != null && (
                                <span className="text-xs text-muted-foreground">₹{service.price}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell>
                          <p className="text-xs text-muted-foreground">{format(parseISO(appt.date), 'EEE, d MMM')}</p>
                          <p className="text-sm font-semibold">{formatTime(appt.start_time)}</p>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <AppointmentStatusBadge status={appt.status} />
                        </TableCell>

                        {/* Source */}
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            {SOURCE_ICON[appt.source] ?? null}
                            <span className="text-xs capitalize">{appt.source}</span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/appointments/${appt.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                View
                              </Button>
                            </Link>
                            {isRole('admin', 'receptionist') && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  nativeButton={false}
                                  render={
                                    <div
                                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
                                      aria-label="More actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </div>
                                  }
                                />
                                <DropdownMenuContent align="end" className="text-sm">
                                  {appt.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleStatusAction(appt.id, 'confirmed')}>
                                      Confirm
                                    </DropdownMenuItem>
                                  )}
                                  {['pending', 'confirmed', 'rescheduled'].includes(appt.status) && (
                                    <DropdownMenuItem onClick={() => handleStatusAction(appt.id, 'completed')}>
                                      Complete
                                    </DropdownMenuItem>
                                  )}
                                  {['pending', 'confirmed', 'rescheduled'].includes(appt.status) && (
                                    <DropdownMenuItem onClick={() => handleStatusAction(appt.id, 'no_show')}>
                                      No-show
                                    </DropdownMenuItem>
                                  )}
                                  {['pending', 'confirmed', 'rescheduled'].includes(appt.status) && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusAction(appt.id, 'cancelled')}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      Cancel
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p className="text-xs">
                Showing {fromItem}–{toItem} of {totalCount} appointments
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Cancel Appointment"
        variant="destructive"
        loading={updateStatus.isPending}
        onConfirm={() => {
          if (cancelId) {
            updateStatus.mutate(
              { id: cancelId, status: 'cancelled' },
              { onSettled: () => setCancelId(null) }
            )
          }
        }}
      />
    </div>
  )
}
