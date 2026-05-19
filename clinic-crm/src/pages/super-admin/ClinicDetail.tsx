import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
  XCircle,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useQueryClient } from '@tanstack/react-query'
import { AddDoctorModal } from '@/components/doctors/AddDoctorModal'
import { AddPatientModal } from '@/components/patients/AddPatientModal'
import { AddUserModal } from '@/components/super-admin/AddUserModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useAppointmentsTrend,
  useClinicDoctors,
  useClinicPatients,
  useClinicRecentAppointments,
  useClinicUsers,
  useClinicWithStats,
  useDeleteClinic,
  useToggleUserActive,
  useUpdateClinicInfo,
  useUpdateClinicStatus,
} from '@/hooks/useSuperAdmin'
import type { ClinicStatus } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  clinic_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  receptionist: 'bg-amber-50 text-amber-700 border-amber-200',
  doctor: 'bg-blue-50 text-blue-700 border-blue-200',
}
const APT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-slate-100 text-slate-600',
  rescheduled: 'bg-orange-100 text-orange-700',
}

const TABS = ['Overview', 'Doctors', 'Patients', 'Users', 'Settings']

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusPill({ status }: { status: ClinicStatus }) {
  if (status === 'active') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
  if (status === 'suspended') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Suspended</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />Inactive</span>
}

function KpiStrip({ clinicId }: { clinicId: string }) {
  const { data: clinic, isLoading } = useClinicWithStats(clinicId)
  const cards = [
    { label: 'Total Appointments', value: clinic?.total_appointments ?? 0, footer: 'All time', iconBg: 'bg-blue-100', icon: <Calendar className="h-5 w-5 text-blue-600" /> },
    { label: 'Today', value: clinic?.appointments_today ?? 0, footer: 'Today only', iconBg: 'bg-violet-100', icon: <Calendar className="h-5 w-5 text-violet-600" /> },
    { label: 'Patients', value: clinic?.total_patients ?? 0, footer: 'All time', iconBg: 'bg-pink-100', icon: <Users className="h-5 w-5 text-pink-600" /> },
    { label: 'Doctors', value: clinic?.total_doctors ?? 0, footer: 'All time', iconBg: 'bg-teal-100', icon: <Stethoscope className="h-5 w-5 text-teal-600" /> },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
        : cards.map((card) => (
            <Card key={card.label} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3"><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.iconBg)}>{card.icon}</div><p className="text-sm text-slate-500">{card.label}</p></div>
                <div><p className="text-3xl font-bold text-slate-900">{card.value}</p><p className="mt-1 text-xs text-slate-400">{card.footer}</p></div>
              </CardContent>
            </Card>
          ))}
    </div>
  )
}

function OverviewPanel({ clinicId, onBookAppointment }: { clinicId: string; onBookAppointment: () => void }) {
  const { data: trend = [], isLoading: trendLoading } = useAppointmentsTrend(clinicId)
  const { data: recentApts = [], isLoading: aptsLoading } = useClinicRecentAppointments(clinicId, 8)
  const chartData = trend.map((item: any) => ({ date: item.date, count: item.count }))

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold text-slate-900">Appointments - Last 30 days</CardTitle></CardHeader>
        <CardContent>
          {trendLoading ? <Skeleton className="h-72 w-full rounded-xl" /> : chartData.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center"><Calendar className="mb-2 h-8 w-8 text-slate-400" /><p className="text-sm font-medium text-slate-700">No trend data yet</p><p className="text-xs text-slate-500">Activity appears once appointments are created.</p></div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} /><stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#0d9488" fill="url(#trendFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">Recent Appointments</CardTitle>
          <Button variant="outline" className="rounded-lg border-slate-200 text-sm transition-all duration-150 hover:bg-slate-100" onClick={onBookAppointment}>Book First Appointment</Button>
        </CardHeader>
        <CardContent>
          {aptsLoading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div> : recentApts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center"><Calendar className="mb-2 h-8 w-8 text-slate-400" /><p className="text-sm font-medium text-slate-700">No appointments yet</p><Button onClick={onBookAppointment} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Book First Appointment</Button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Doctor</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody>
                  {recentApts.map((apt: any) => {
                    const patient = apt.patients ?? apt.patient
                    const doctor = apt.doctors ?? apt.doctor
                    return (
                      <tr key={apt.id} className="border-b border-slate-50 transition-all duration-150 hover:bg-slate-50/70">
                        <td className="px-3 py-3 text-slate-800">{patient?.name ?? 'Unknown patient'}</td>
                        <td className="px-3 py-3 text-slate-600">{doctor?.name ?? 'Unknown doctor'}</td>
                        <td className="px-3 py-3 text-slate-600">{apt.date} {apt.start_time ? `, ${apt.start_time}` : ''}</td>
                        <td className="px-3 py-3"><span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', APT_STATUS_COLORS[apt.status] ?? 'bg-slate-100 text-slate-600')}>{String(apt.status).replace('_', ' ')}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DoctorsTab({ clinicId, onAddDoctor }: { clinicId: string; onAddDoctor: () => void }) {
  const { data: doctors = [], isLoading } = useClinicDoctors(clinicId)
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-40 rounded-lg" /><Skeleton className="h-72 w-full rounded-2xl" /></div>

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-slate-900">Doctors</CardTitle>
        <Button onClick={onAddDoctor} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-700"><Plus className="mr-1 h-4 w-4" />Add Doctor</Button>
      </CardHeader>
      <CardContent>
        {doctors.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
            <Stethoscope className="mb-2 h-8 w-8 text-slate-400" /><p className="text-sm font-medium text-slate-700">No doctors added</p>
            <Button onClick={onAddDoctor} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">+ Add First Doctor</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Doctor</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Slots/day</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
              <tbody>
                {doctors.map((doctor: any) => (
                  <tr key={doctor.id} className="border-b border-slate-50 transition-all duration-150 hover:bg-slate-50/70">
                    <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">{doctor.name?.slice(0, 2).toUpperCase()}</div><div><p className="font-medium text-slate-900">{doctor.name}</p><p className="text-xs text-slate-500">{doctor.specialization ?? 'General'}</p></div></div></td>
                    <td className="px-3 py-3 text-slate-600">{doctor.phone ?? '-'}</td>
                    <td className="px-3 py-3 text-slate-600">{doctor.max_appointments_per_day ?? '-'}</td>
                    <td className="px-3 py-3"><Badge variant="outline" className={doctor.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>{doctor.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-3 py-3"><Button variant="outline" className="rounded-lg px-3 py-1.5 text-xs">Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PatientsTab({ clinicId, onAddPatient }: { clinicId: string; onAddPatient: () => void }) {
  const { data: patients = [], isLoading } = useClinicPatients(clinicId)
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => patients.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.phone ?? '').includes(search)), [patients, search])

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2"><CardTitle className="text-base font-semibold text-slate-900">Patients</CardTitle><Button variant="outline" onClick={onAddPatient} className="rounded-lg border-slate-200">+ Add Patient</Button></div>
        <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient" className="rounded-lg border-slate-200 pl-9" /></div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-72 w-full rounded-xl" /> : filtered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center"><Users className="mb-2 h-8 w-8 text-slate-400" /><p className="text-sm font-medium text-slate-700">No patients yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Gender</th><th className="px-3 py-2">Blood Group</th><th className="px-3 py-2">Created</th></tr></thead>
              <tbody>
                {filtered.map((patient: any) => (
                  <tr key={patient.id} className="border-b border-slate-50 transition-all duration-150 hover:bg-slate-50/70">
                    <td className="px-3 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">{patient.name?.slice(0, 2).toUpperCase()}</div><span className="font-medium text-slate-900">{patient.name}</span></div></td>
                    <td className="px-3 py-3 text-slate-600">{patient.phone}</td><td className="px-3 py-3 text-slate-600">{patient.gender ?? '-'}</td><td className="px-3 py-3 text-slate-600">{patient.blood_group ?? '-'}</td><td className="px-3 py-3 text-slate-600">{formatDate(patient.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsersTab({ clinicId }: { clinicId: string }) {
  const { data: users = [], isLoading } = useClinicUsers(clinicId)
  const { mutate: toggleUser, isPending } = useToggleUserActive()
  const [showAddUser, setShowAddUser] = useState(false)

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Team Members</h3>
          <p className="text-sm text-slate-500">Manage clinic staff and their roles</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="pt-4">
          {users.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
              <Users className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">No users yet</p>
              <p className="text-xs text-slate-500 mt-1">Add clinic admins, doctors, and receptionists</p>
              <button
                onClick={() => setShowAddUser(true)}
                className="mt-3 flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First User
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => {
                    const initials = user.name?.slice(0, 2).toUpperCase() || 'U'
                    return (
                      <tr key={user.id} className="border-b border-slate-50 transition-all duration-150 hover:bg-slate-50/70">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                              {initials}
                            </div>
                            <span className="font-medium text-slate-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{user.email}</td>
                        <td className="px-3 py-3">
                          <span className={cn('rounded px-2.5 py-1 text-xs font-medium capitalize border', ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="px-3 py-3">
                          <Switch
                            checked={user.is_active}
                            disabled={isPending}
                            onCheckedChange={(checked) => toggleUser({ userId: user.id, isActive: checked, clinicId })}
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => toast.success('Password reset email sent')}
                          >
                            Reset Password
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserModal
        open={showAddUser}
        onOpenChange={setShowAddUser}
        clinicId={clinicId}
      />
    </>
  )
}

function SettingsTab({ clinicId, clinicName, onDelete }: { clinicId: string; clinicName: string; onDelete: () => void }) {
  const { data: clinic } = useClinicWithStats(clinicId)
  const { mutate: updateInfo, isPending } = useUpdateClinicInfo()
  const [name, setName] = useState(clinic?.name ?? '')
  const [color, setColor] = useState(clinic?.primary_color ?? '#0d9488')
  const [phone, setPhone] = useState(clinic?.phone ?? '')
  const [email, setEmail] = useState(clinic?.email ?? '')
  const [address, setAddress] = useState(clinic?.address ?? '')
  function handleSave() { updateInfo({ clinicId, data: { name: name || undefined, primary_color: color, phone: phone || undefined, email: email || undefined, address: address || undefined } }) }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-100 shadow-sm"><CardHeader><CardTitle className="text-base font-semibold text-slate-900">Clinic Settings</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Clinic Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg" /></div><div className="space-y-2"><Label>Primary Color</Label><div className="flex items-center gap-3"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 p-1" /><Input value={color} onChange={(e) => setColor(e.target.value)} className="w-32 rounded-lg font-mono" /></div></div><div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-lg" /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" /></div><div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-lg" /></div><Button onClick={handleSave} disabled={isPending} className="w-full rounded-lg bg-teal-600 hover:bg-teal-700">{isPending ? 'Saving...' : 'Save Changes'}</Button></CardContent></Card>
      <Card className="rounded-2xl border-red-200 shadow-sm"><CardHeader><CardTitle className="text-base font-semibold text-red-600">Danger Zone</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-slate-900">Delete clinic</p><p className="text-xs text-slate-500">Permanently remove {clinicName} and related data.</p></div><Button variant="destructive" className="rounded-lg" onClick={onDelete}>Delete</Button></CardContent></Card>
    </div>
  )
}

function RightSidebar({ clinicId, onAddDoctor, onAddPatient, onBookAppointment }: { clinicId: string; onAddDoctor: () => void; onAddPatient: () => void; onBookAppointment: () => void }) {
  const { data: clinic, isLoading } = useClinicWithStats(clinicId)
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-60 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
  if (!clinic) return null
  return (
    <div className="sticky top-4 space-y-4">
      <Card className="rounded-2xl border-slate-100 shadow-sm"><CardHeader><CardTitle className="text-base font-semibold text-slate-900">Clinic Info</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Address</p><p className="text-slate-800">{clinic.address ?? 'Bharath Nagar'}</p></div></div><div className="flex items-start gap-2 text-sm"><Phone className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Phone</p><p className="text-slate-800">{clinic.phone ?? '-'}</p></div></div><div className="flex items-start gap-2 text-sm"><Mail className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Email</p><p className="text-slate-800">{clinic.email ?? '-'}</p></div></div><div className="flex items-start gap-2 text-sm"><Clock className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Hours</p><p className="text-slate-800">Mon-Sat, 09:00-18:00</p></div></div><Button variant="outline" className="mt-2 w-full rounded-lg border-slate-200 transition-all duration-150 hover:bg-slate-100">Edit Clinic Info</Button></CardContent></Card>
      <Card className="rounded-2xl border-slate-100 shadow-sm"><CardHeader><CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle></CardHeader><CardContent className="space-y-2"><Button onClick={onAddDoctor} className="w-full rounded-lg bg-teal-600 transition-all duration-150 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />Add Doctor</Button><Button variant="outline" onClick={onAddPatient} className="w-full rounded-lg border-slate-200 transition-all duration-150 hover:bg-slate-100"><Plus className="mr-2 h-4 w-4" />Add Patient</Button><Button variant="outline" onClick={onBookAppointment} className="w-full rounded-lg border-slate-200 transition-all duration-150 hover:bg-slate-100">View Appointments</Button><Button variant="ghost" className="w-full rounded-lg transition-all duration-150 hover:bg-slate-100"><Download className="mr-2 h-4 w-4" />Export Data</Button></CardContent></Card>
    </div>
  )
}

export default function ClinicDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clinicId = id ?? ''
  const { data: clinic, isLoading, refetch } = useClinicWithStats(clinicId)
  const { mutate: updateStatus, isPending: statusPending } = useUpdateClinicStatus()
  const { mutate: doDelete, isPending: deletePending } = useDeleteClinic()

  const [activeTab, setActiveTab] = useState('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)

  if (isLoading) return <div className="space-y-6 bg-[#f8fafc] p-1"><Skeleton className="h-20 w-full rounded-2xl" /><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div><Skeleton className="h-[420px] w-full rounded-2xl" /></div>
  if (!clinic) return <div className="bg-[#f8fafc] py-16 text-center"><p className="text-slate-500">Clinic not found.</p><Button variant="link" onClick={() => navigate('/super-admin/clinics')}>Back to clinics</Button></div>

  function handleStatusChange(status: ClinicStatus) {
    updateStatus({ clinicId, status })
  }
  function handleDeleteConfirm() {
    if (deleteText !== (clinic?.name ?? '')) return toast.error('Clinic name does not match.')
    doDelete(clinicId, { onSuccess: () => navigate('/super-admin/clinics') })
  }
  function handleDoctorCreated() {
    queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
    queryClient.invalidateQueries({ queryKey: ['clinic-stats', clinicId] })
  }
  function handlePatientCreated() {
    queryClient.invalidateQueries({ queryKey: ['clinic-patients', clinicId] })
    queryClient.invalidateQueries({ queryKey: ['clinic-stats', clinicId] })
  }
  const handleBookAppointment = () => navigate('/appointments/new')

  return (
    <div className="space-y-6 bg-[#f8fafc] text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500">
        <button className="transition-all duration-150 hover:text-slate-900" onClick={() => navigate('/super-admin')}>Super Admin</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button className="transition-all duration-150 hover:text-slate-900" onClick={() => navigate('/super-admin/clinics')}>Clinics</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-800">{clinic.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/super-admin/clinics')} className="rounded-xl border border-slate-200 p-2 transition-all duration-150 hover:bg-slate-100" aria-label="Back">
            <ArrowLeft className="h-4 w-4 text-slate-700" />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-xl font-bold text-white shadow-sm">
            {clinic.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{clinic.name}</h1>
              <StatusPill status={clinic.status} />
            </div>
            <p className="text-sm text-slate-500">Created {formatDate(clinic.created_at)} {clinic.address ? `- ${clinic.address}` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} className="rounded-lg border-slate-200 px-4 py-2 text-sm font-medium transition-all duration-150 hover:bg-slate-100">
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger nativeButton={false} render={<div className={cn('inline-flex cursor-pointer items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-teal-700', statusPending && 'pointer-events-none opacity-50')}>Change Status</div>} />
            <DropdownMenuContent align="end">
              {clinic.status !== 'active' && <DropdownMenuItem onClick={() => handleStatusChange('active')}><CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />Activate</DropdownMenuItem>}
              {clinic.status !== 'inactive' && <DropdownMenuItem onClick={() => handleStatusChange('inactive')}><PauseCircle className="mr-2 h-4 w-4 text-slate-500" />Deactivate</DropdownMenuItem>}
              {clinic.status !== 'suspended' && <DropdownMenuItem onClick={() => handleStatusChange('suspended')}><XCircle className="mr-2 h-4 w-4 text-amber-500" />Suspend</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setDeleteOpen(true)} className="rounded-lg border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50">
            Delete Clinic
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip clinicId={clinicId} />

      {/* Main content: tabs left, sidebar right */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left — tab nav + content */}
        <div className="col-span-2">
          {/* Tab pills */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.toLowerCase()
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewPanel clinicId={clinicId} onBookAppointment={handleBookAppointment} />
          )}
          {activeTab === 'doctors' && (
            <DoctorsTab clinicId={clinicId} onAddDoctor={() => setShowAddDoctor(true)} />
          )}
          {activeTab === 'patients' && (
            <PatientsTab clinicId={clinicId} onAddPatient={() => setShowAddPatient(true)} />
          )}
          {activeTab === 'users' && (
            <UsersTab clinicId={clinicId} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab clinicId={clinicId} clinicName={clinic.name} onDelete={() => setDeleteOpen(true)} />
          )}
        </div>

        {/* Right — clinic info + quick actions */}
        <div className="col-span-1">
          <RightSidebar
            clinicId={clinicId}
            onAddDoctor={() => { setActiveTab('doctors'); setShowAddDoctor(true) }}
            onAddPatient={() => setShowAddPatient(true)}
            onBookAppointment={handleBookAppointment}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); setDeleteText('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Clinic</DialogTitle>
            <DialogDescription>This will permanently delete <strong>{clinic.name}</strong> and all associated data. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <p className="text-sm text-slate-500">Type <strong>{clinic.name}</strong> to confirm:</p>
            <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={clinic.name} className="border-red-200" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-lg" disabled={deleteText !== (clinic?.name ?? '') || deletePending} onClick={handleDeleteConfirm}>{deletePending ? 'Deleting...' : 'Delete Clinic'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddDoctorModal
        open={showAddDoctor}
        onOpenChange={setShowAddDoctor}
        clinicId={clinicId}
        onSuccess={handleDoctorCreated}
      />

      <AddPatientModal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        clinicId={clinicId}
        onCreated={handlePatientCreated}
      />
    </div>
  )
}
