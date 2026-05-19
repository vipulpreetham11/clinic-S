import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal,
  ArrowRight,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ClinicStatusBadge } from './ClinicStatusBadge'
import type { ClinicWithStats } from '@/api/superAdmin'
import type { ClinicStatus } from '@/types'
import { cn } from '@/lib/utils'

interface ClinicCardProps {
  clinic: ClinicWithStats
  onStatusChange: (clinicId: string, status: ClinicStatus) => void
  onDelete: (clinic: ClinicWithStats) => void
}

function timeAgo(dateStr: string | null): { label: string; stale: boolean } {
  if (!dateStr) return { label: 'Never', stale: true }
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (mins < 60) return { label: `${mins}m ago`, stale: false }
  if (hours < 24) return { label: `${hours}h ago`, stale: false }
  if (days === 1) return { label: 'Yesterday', stale: false }
  if (days < 7) return { label: `${days}d ago`, stale: days >= 3 }
  return { label: `${days}d ago`, stale: true }
}

function ClinicInitial({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function ClinicCard({ clinic, onStatusChange, onDelete }: ClinicCardProps) {
  const navigate = useNavigate()
  const activity = timeAgo(clinic.last_activity)

  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      {/* Clinic */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {clinic.logo_url ? (
            <img
              src={clinic.logo_url}
              alt={clinic.name}
              className="h-9 w-9 rounded-lg object-cover shrink-0"
            />
          ) : (
            <ClinicInitial name={clinic.name} color={clinic.primary_color} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{clinic.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {clinic.address ?? clinic.email ?? '—'}
            </p>
          </div>
        </div>
      </td>

      {/* Doctors */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium">{clinic.total_doctors}</span>
      </td>

      {/* Patients */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium">{clinic.total_patients.toLocaleString()}</span>
      </td>

      {/* Today */}
      <td className="px-4 py-3 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              clinic.appointments_today > 0 ? 'bg-emerald-500' : 'bg-slate-300'
            )}
          />
          <span className="text-sm font-medium">{clinic.appointments_today}</span>
        </div>
      </td>

      {/* Last Active */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span
            className={cn(
              'text-xs',
              activity.stale ? 'text-red-500 font-medium' : 'text-muted-foreground'
            )}
          >
            {activity.label}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <ClinicStatusBadge status={clinic.status} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <div className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {clinic.status !== 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange(clinic.id, 'active')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  Activate
                </DropdownMenuItem>
              )}
              {clinic.status !== 'inactive' && (
                <DropdownMenuItem onClick={() => onStatusChange(clinic.id, 'inactive')}>
                  <PauseCircle className="mr-2 h-4 w-4 text-slate-500" />
                  Deactivate
                </DropdownMenuItem>
              )}
              {clinic.status !== 'suspended' && (
                <DropdownMenuItem onClick={() => onStatusChange(clinic.id, 'suspended')}>
                  <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => onDelete(clinic)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Delete Clinic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  )
}
