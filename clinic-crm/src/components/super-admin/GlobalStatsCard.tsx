import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface GlobalStatsCardProps {
  label: string
  value: number | string
  sub?: string
  trend?: { value: number; label: string }
  icon: ReactNode
  iconBg?: string
  loading?: boolean
  formatValue?: (v: number | string) => string
}

function fmt(v: number | string): string {
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

export function GlobalStatsCard({
  label,
  value,
  sub,
  trend,
  icon,
  iconBg = 'bg-slate-100',
  loading,
}: GlobalStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const trendPositive = trend && trend.value > 0
  const trendNeutral = trend && trend.value === 0

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', iconBg)}>
            {icon}
          </div>
        </div>

        <div className="text-2xl font-bold text-foreground mb-1">{fmt(value)}</div>

        {sub && <p className="text-xs text-muted-foreground mb-2">{sub}</p>}

        {trend && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              trendNeutral
                ? 'text-muted-foreground'
                : trendPositive
                  ? 'text-emerald-600'
                  : 'text-red-500'
            )}
          >
            {trendNeutral ? (
              <Minus className="h-3 w-3" />
            ) : trendPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
