import { useAuthContext } from '@/context/AuthContext'
import {
  useTodayStats,
  useTodayAppointments,
  useDoctorStatusToday,
  useWeeklyTrend,
  useRecentActivity
} from '@/hooks/useAdminDashboard'
import { QuickStats } from '@/components/admin/QuickStats'
import { TodaySchedule } from '@/components/admin/TodaySchedule'
import { DoctorStatusCard } from '@/components/admin/DoctorStatusCard'
import { WeeklyTrendChart } from '@/components/admin/WeeklyTrendChart'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { Skeleton } from '@/components/ui/skeleton'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 p-6 h-64 space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-6 h-64 space-y-3">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { profile, clinic } = useAuthContext()

  const { data: stats, isLoading: statsLoading } = useTodayStats()
  const { data: appointments, isLoading: aptsLoading } = useTodayAppointments()
  const { data: doctors, isLoading: docsLoading } = useDoctorStatusToday()
  const { data: weeklyTrend, isLoading: trendLoading } = useWeeklyTrend()
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity()

  const isLoading = statsLoading || aptsLoading || docsLoading || trendLoading || activityLoading

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const fallbackStats = {
    total: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
    new_patients: 0,
    waitlist: 0,
    pending_reminders: 0,
    active_conversations: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          {getGreeting()}, {profile?.name?.split(' ')[0] ?? 'Admin'} 👋
        </h2>
        <p className="text-slate-500 mt-0.5 text-sm">
          {clinic?.name ?? 'Your Clinic'} &nbsp;·&nbsp;{' '}
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <QuickStats stats={stats ?? fallbackStats} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-[600px]">
          <TodaySchedule appointments={appointments ?? []} />
        </div>
        <div className="lg:col-span-2 h-[600px]">
          <DoctorStatusCard doctors={doctors ?? []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[450px]">
          <WeeklyTrendChart data={weeklyTrend ?? []} />
        </div>
        <div className="h-[450px]">
          <RecentActivity activity={recentActivity ?? []} />
        </div>
      </div>
    </div>
  )
}
