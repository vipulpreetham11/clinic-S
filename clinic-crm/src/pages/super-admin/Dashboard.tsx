import { Building2, Calendar, Users, Stethoscope, RefreshCw, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GlobalStatsCard } from '@/components/super-admin/GlobalStatsCard'
import { AppointmentsTrendChart, ClinicsStatusChart } from '@/components/super-admin/RevenueChart'
import { useAuthContext } from '@/context/AuthContext'
import { usePlatformStats, useAllClinics, useAppointmentsTrend } from '@/hooks/useSuperAdmin'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePlatformStats()
  const { data: clinics, isLoading: clinicsLoading, refetch: refetchClinics } = useAllClinics()
  const { data: trend = [], isLoading: trendLoading } = useAppointmentsTrend()

  const isLoading = statsLoading || clinicsLoading

  function handleRefresh() {
    refetchStats()
    refetchClinics()
  }

  const suspendedCount = clinics?.filter((c) => c.status === 'suspended').length ?? 0
  const statusBreakdown = {
    active: stats?.active_clinics ?? 0,
    inactive: Math.max(0, (stats?.total_clinics ?? 0) - (stats?.active_clinics ?? 0) - suspendedCount),
    suspended: suspendedCount,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {greeting()}, {profile?.name?.split(' ')[0] ?? 'Admin'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview — all clinics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/super-admin/clinics/new')} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            Add Clinic
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlobalStatsCard
          label="Total Clinics"
          value={stats?.total_clinics ?? 0}
          sub={`${stats?.active_clinics ?? 0} active`}
          trend={{ value: stats?.new_clinics_this_month ?? 0, label: `+${stats?.new_clinics_this_month ?? 0} this month` }}
          icon={<Building2 className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={statsLoading}
        />
        <GlobalStatsCard
          label="Today's Appointments"
          value={stats?.total_appointments_today ?? 0}
          sub="Across all clinics"
          trend={{ value: stats?.total_appointments_month ?? 0, label: `${stats?.total_appointments_month ?? 0} this month` }}
          icon={<Calendar className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={statsLoading}
        />
        <GlobalStatsCard
          label="Total Patients"
          value={stats?.total_patients ?? 0}
          sub="Registered patients"
          icon={<Users className="h-4 w-4 text-purple-600" />}
          iconBg="bg-purple-50"
          loading={statsLoading}
        />
        <GlobalStatsCard
          label="Active Doctors"
          value={stats?.total_doctors ?? 0}
          sub="Across all clinics"
          icon={<Stethoscope className="h-4 w-4 text-orange-600" />}
          iconBg="bg-orange-50"
          loading={statsLoading}
        />
      </div>

      {/* Team Overview */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight text-slate-800">Team Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlobalStatsCard
            label="Clinic Admins"
            value={stats?.total_clinic_admins ?? 0}
            sub="Platform wide"
            icon={<Users className="h-4 w-4 text-purple-600" />}
            iconBg="bg-purple-50"
            loading={statsLoading}
          />
          <GlobalStatsCard
            label="Doctors"
            value={stats?.total_doctors ?? 0}
            sub="Platform wide"
            icon={<Stethoscope className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50"
            loading={statsLoading}
          />
          <GlobalStatsCard
            label="Receptionists"
            value={stats?.total_receptionists ?? 0}
            sub="Platform wide"
            icon={<Users className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50"
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AppointmentsTrendChart data={trend} loading={trendLoading} />
        </div>
        <ClinicsStatusChart data={statusBreakdown} loading={statsLoading} />
      </div>

      {/* Recent clinics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Recent Clinics</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => navigate('/super-admin/clinics')}
          >
            View all →
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {clinicsLoading ? (
            <div className="px-4 pb-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : !clinics || clinics.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No clinics yet.{' '}
              <button
                onClick={() => navigate('/super-admin/clinics/new')}
                className="text-primary underline underline-offset-2"
              >
                Create the first one
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {clinics.slice(0, 6).map((clinic) => (
                <div
                  key={clinic.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: clinic.primary_color }}
                  >
                    {clinic.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{clinic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {clinic.total_doctors} dr · {clinic.total_patients.toLocaleString()} patients
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-semibold">{clinic.appointments_today}</p>
                      <p className="text-xs text-muted-foreground">today</p>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        clinic.status === 'active'
                          ? 'bg-emerald-500'
                          : clinic.status === 'suspended'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
