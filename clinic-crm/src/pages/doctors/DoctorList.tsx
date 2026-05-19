import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Stethoscope, LayoutGrid, List } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AddDoctorModal } from '@/components/doctors/AddDoctorModal'
import { DoctorCard } from '@/components/doctors/DoctorCard'
import { DoctorAvatar } from '@/components/doctors/DoctorAvatar'
import { useDoctors, useDoctorStats } from '@/hooks/useDoctors'
import { useAuthContext } from '@/context/AuthContext'
import type { Doctor } from '@/api/doctors'
import { format } from 'date-fns'

function DoctorTableRow({ doctor, readOnly }: { doctor: Doctor; readOnly: boolean }) {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayStats } = useDoctorStats(doctor.id, today, today)

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <DoctorAvatar doctor={doctor} size="sm" />
          <div>
            <p className="text-sm font-medium">Dr. {doctor.name}</p>
            <p className="text-xs text-muted-foreground">{doctor.specialization ?? 'General Practice'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{doctor.specialization ?? '-'}</TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {doctor.services?.slice(0, 2).map((s) => s.name).join(', ') || 'No services'}
        </span>
      </TableCell>
      <TableCell>{doctor.arrival_time} - {doctor.departure_time}</TableCell>
      <TableCell>{todayStats?.total ?? '--'}</TableCell>
      <TableCell>
        <Badge variant={doctor.is_active ? 'default' : 'outline'}>
          {doctor.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/doctors/${doctor.id}/schedule`)}>
            View
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => navigate(`/doctors/${doctor.id}`)}>
              Edit
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function DoctorList() {
  const navigate = useNavigate()
  const { isRole } = useAuthContext()
  const { data: doctors = [], isLoading } = useDoctors()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [specialization, setSpecialization] = useState('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [showAddDoctor, setShowAddDoctor] = useState(false)

  const isAdmin = isRole('admin', 'clinic_admin')
  const isReceptionist = isRole('receptionist')

  const specializations = useMemo(() => {
    const set = new Set<string>()
    doctors.forEach((d) => { if (d.specialization) set.add(d.specialization) })
    return Array.from(set)
  }, [doctors])

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      const matchesSearch = [d.name, d.specialization ?? '']
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesStatus = status === 'all' || (status === 'active' ? d.is_active : !d.is_active)
      const matchesSpec = specialization === 'all' || d.specialization === specialization
      return matchesSearch && matchesStatus && matchesSpec
    })
  }, [doctors, search, status, specialization])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Manage clinical staff and schedules"
        action={isAdmin ? (
          <Button onClick={() => setShowAddDoctor(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Doctor
          </Button>
        ) : undefined}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors..."
              className="pl-8"
              aria-label="Search doctors"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v || 'all')}>
            <SelectTrigger aria-label="Filter status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={specialization} onValueChange={(v) => setSpecialization(v || 'all')}>
            <SelectTrigger aria-label="Filter specialization">
              <SelectValue placeholder="Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specializations</SelectItem>
              {specializations.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {isReceptionist && <Badge variant="outline">View Only</Badge>}
          <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon-sm" onClick={() => setView('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="icon-sm" onClick={() => setView('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border p-4 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-12 w-12" />}
          title="No doctors added yet"
          description="Add your first doctor to start accepting appointments."
          action={isAdmin ? (
            <Button onClick={() => setShowAddDoctor(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Doctor
            </Button>
          ) : undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              readOnly={!isAdmin}
              onViewSchedule={() => navigate(`/doctors/${doctor.id}/schedule`)}
              onEdit={() => navigate(`/doctors/${doctor.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Doctor</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doctor) => (
                <DoctorTableRow key={doctor.id} doctor={doctor} readOnly={!isAdmin} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isAdmin && (
        <AddDoctorModal
          open={showAddDoctor}
          onOpenChange={setShowAddDoctor}
        />
      )}
    </div>
  )
}
