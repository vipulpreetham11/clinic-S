import { useState } from 'react'
import { Calendar, CheckCircle2, XCircle, Users } from 'lucide-react'
import { useTodayStats, useWeeklyTrend, useDoctorStatusToday } from '@/hooks/useAdminDashboard'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'

type DateRange = 'today' | 'week' | 'month' | '3months'

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: '3months', label: 'Last 3 Months' },
]

export default function Analytics() {
  const [range, setRange] = useState<DateRange>('week')

  const { data: stats, isLoading: statsLoading } = useTodayStats()
  const { data: weeklyTrend, isLoading: trendLoading } = useWeeklyTrend()
  const { data: doctorStatus, isLoading: doctorsLoading } = useDoctorStatusToday()

  const kpiCards = [
    {
      label: 'Total Appointments',
      value: stats?.total ?? 0,
      icon: Calendar,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      valueCls: 'text-teal-700',
    },
    {
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueCls: 'text-green-700',
    },
    {
      label: 'Cancelled',
      value: stats?.cancelled ?? 0,
      icon: XCircle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      valueCls: 'text-red-700',
    },
    {
      label: 'New Patients',
      value: stats?.new_patients ?? 0,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueCls: 'text-blue-700',
    },
  ]

  const chartData = (weeklyTrend ?? []).map((d) => ({
    name: d.day,
    Total: d.total,
    Completed: d.completed,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Clinic performance insights"
      />

      {/* Date range selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {DATE_RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              range === r.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI stat cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <div className={cn('p-2 rounded-lg', card.iconBg)}>
                  <Icon className={cn('h-4 w-4', card.iconColor)} />
                </div>
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className={cn('text-3xl font-bold', card.valueCls)}>{card.value}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Weekly trend chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-6">Appointment Trends</h2>
        {trendLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-slate-400">
            No trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="Total" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Completed" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Doctor status */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Doctor Status Today</h2>
        {doctorsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !doctorStatus || doctorStatus.length === 0 ? (
          <p className="text-sm text-slate-400">No active doctors found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {doctorStatus.map((doctor) => (
              <div key={doctor.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {doctor.name?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Dr. {doctor.name}</p>
                    <p className="text-xs text-slate-500">{doctor.specialization ?? 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-sm font-semibold text-slate-900">{doctor.totalTodayApts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Done</p>
                    <p className="text-sm font-semibold text-green-600">{doctor.completedApts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Left</p>
                    <p className="text-sm font-semibold text-teal-600">{doctor.remainingApts}</p>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      doctor.isWorkingToday
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {doctor.isWorkingToday ? 'On duty' : 'Day off'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
