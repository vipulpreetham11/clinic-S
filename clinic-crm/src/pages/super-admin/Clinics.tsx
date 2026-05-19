import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  MoreHorizontal,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAllClinics, useDeleteClinic, useUpdateClinicStatus } from '@/hooks/useSuperAdmin'
import type { ClinicWithStats } from '@/api/superAdmin'
import type { ClinicStatus } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type SortKey = 'name' | 'appointments' | 'recent' | 'lastActive'
type StatusFilter = 'all' | ClinicStatus

function StatusPill({ status }: { status: ClinicStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    )
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Suspended
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 text-xs font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  )
}

function ClinicsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function Clinics() {
  const navigate = useNavigate()
  const { data: clinics = [], isLoading, refetch } = useAllClinics()
  const { mutate: updateStatus, isPending: statusPending } = useUpdateClinicStatus()
  const { mutate: doDelete, isPending: deletePending } = useDeleteClinic()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [deleteTarget, setDeleteTarget] = useState<ClinicWithStats | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const filtered = useMemo(() => {
    let list = [...clinics]

    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      )
    }

    switch (sortKey) {
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'appointments':
        list.sort((a, b) => b.total_appointments - a.total_appointments)
        break
      case 'lastActive':
        list.sort((a, b) => {
          if (!a.last_activity) return 1
          if (!b.last_activity) return -1
          return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        })
        break
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return list
  }, [clinics, search, sortKey, statusFilter])

  const totals = useMemo(() => {
    const active = clinics.filter((c) => c.status === 'active').length
    const totalDoctors = clinics.reduce((sum, c) => sum + c.total_doctors, 0)
    const totalPatients = clinics.reduce((sum, c) => sum + c.total_patients, 0)
    const totalToday = clinics.reduce((sum, c) => sum + c.appointments_today, 0)
    return { active, totalDoctors, totalPatients, totalToday }
  }, [clinics])

  function handleStatusChange(clinicId: string, status: ClinicStatus) {
    updateStatus({ clinicId, status })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    if (deleteConfirmText !== deleteTarget.name) {
      toast.error('Clinic name does not match. Please type it exactly.')
      return
    }

    doDelete(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        setDeleteConfirmText('')
      },
    })
  }

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinics</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoading ? 'Loading clinics...' : `${clinics.length} total · ${totals.active} active`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-lg border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            onClick={() => navigate('/super-admin/clinics/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Clinic
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ClinicsSkeleton />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Building2 className="h-4 w-4 text-blue-500" />Total Clinics
                </div>
                <p className="text-3xl font-bold text-slate-900">{clinics.length}</p>
                <p className="mt-1 text-xs text-slate-400">All workspaces</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />Active Clinics
                </div>
                <p className="text-3xl font-bold text-slate-900">{totals.active}</p>
                <p className="mt-1 text-xs text-slate-400">Operational now</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Users className="h-4 w-4 text-pink-600" />Patients
                </div>
                <p className="text-3xl font-bold text-slate-900">{totals.totalPatients.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">Across all clinics</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <Calendar className="h-4 w-4 text-violet-600" />Today's Appointments
                </div>
                <p className="text-3xl font-bold text-slate-900">{totals.totalToday}</p>
                <p className="mt-1 text-xs text-slate-400">Today only</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + filter bar */}
          <Card className="rounded-2xl border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Clinic Directory</CardTitle>
              <div className="grid gap-3 lg:grid-cols-12 mt-2">
                <div className="relative lg:col-span-5">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="rounded-lg border-slate-200 pl-9"
                    placeholder="Search by name, phone, address"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="lg:col-span-3">
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="rounded-lg border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-4">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="rounded-lg border-slate-200"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="name">Name A–Z</SelectItem>
                      <SelectItem value="appointments">Most Appointments</SelectItem>
                      <SelectItem value="lastActive">Last Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-10 w-10" />}
                  title={search || statusFilter !== 'all' ? 'No clinics match your filters' : 'No clinics yet'}
                  description={search || statusFilter !== 'all' ? 'Try changing search or filter options.' : 'Create your first clinic to start onboarding teams.'}
                  action={!search && statusFilter === 'all' ? (
                    <Button className="rounded-lg bg-teal-600 hover:bg-teal-700" onClick={() => navigate('/super-admin/clinics/new')}>
                      <Plus className="mr-2 h-4 w-4" />Add First Clinic
                    </Button>
                  ) : undefined}
                  className="py-14"
                />
              ) : (
                <div className="space-y-3">
                  {filtered.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
                    >
                      {/* Avatar + name + subtitle */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {clinic.logo_url ? (
                          <img src={clinic.logo_url} alt={clinic.name} className="h-12 w-12 rounded-xl object-cover flex-none" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-base font-bold text-white flex-none">
                            {clinic.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{clinic.name}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {clinic.email ?? clinic.address ?? '-'}
                          </p>
                        </div>
                      </div>

                      {/* Address + phone (hidden on small screens) */}
                      <div className="hidden xl:block flex-1 min-w-0">
                        <p className="text-sm text-slate-600 truncate">{clinic.address ?? '-'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-400">{clinic.phone ?? '-'}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Stethoscope className="h-3 w-3" />{clinic.total_doctors} doctors
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="h-3 w-3" />{clinic.total_patients} patients
                          </span>
                        </div>
                      </div>

                      {/* Status + actions */}
                      <div className="flex items-center gap-3 flex-none" onClick={(e) => e.stopPropagation()}>
                        <StatusPill status={clinic.status} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-teal-200 text-teal-700 hover:bg-teal-50 text-xs px-3"
                          onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
                        >
                          View Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            nativeButton={false}
                            render={
                              <div className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Clinic actions">
                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                              </div>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}>
                              Open Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {clinic.status !== 'active' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(clinic.id, 'active')}>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />Activate
                              </DropdownMenuItem>
                            )}
                            {clinic.status !== 'inactive' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(clinic.id, 'inactive')}>
                                <PauseCircle className="mr-2 h-4 w-4 text-slate-500" />Deactivate
                              </DropdownMenuItem>
                            )}
                            {clinic.status !== 'suspended' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(clinic.id, 'suspended')}>
                                <XCircle className="mr-2 h-4 w-4 text-amber-500" />Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-600"
                              onClick={() => { setDeleteTarget(clinic); setDeleteConfirmText('') }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />Delete Clinic
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteConfirmText('')
          }
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Clinic</DialogTitle>
            <DialogDescription>
              This action <strong>cannot be undone</strong>. All data for this clinic including appointments, patients, doctors, and users will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              Type <span className="font-semibold text-slate-900">{deleteTarget?.name}</span> to confirm:
            </p>
            <Label htmlFor="deleteConfirm" className="sr-only">Clinic name</Label>
            <Input
              id="deleteConfirm"
              placeholder={deleteTarget?.name}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="rounded-lg border-red-200"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              disabled={deleteConfirmText !== deleteTarget?.name || deletePending || statusPending}
              onClick={handleDeleteConfirm}
            >
              {deletePending ? 'Deleting...' : 'Delete Clinic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
