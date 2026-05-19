import { cn } from '@/lib/utils'
import type { ClinicStatus } from '@/types'

const CONFIG: Record<ClinicStatus, { label: string; dot: string; badge: string }> = {
  active: {
    label: 'Active',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  inactive: {
    label: 'Inactive',
    dot: 'bg-slate-400',
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  suspended: {
    label: 'Suspended',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
}

interface ClinicStatusBadgeProps {
  status: ClinicStatus
  size?: 'sm' | 'md'
}

export function ClinicStatusBadge({ status, size = 'md' }: ClinicStatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG.inactive

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        cfg.badge
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
