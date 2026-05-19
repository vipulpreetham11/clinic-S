import { useNavigate } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Service } from '@/types'

export function formatServiceDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes} min`

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

export function formatServicePrice(price: number | null) {
  if (price == null) return '�'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)
}

interface ServiceCardProps {
  service: Service
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  isActionPending?: boolean
}

export function ServiceCard({
  service,
  onEdit,
  onToggle,
  onDelete,
  isActionPending = false,
}: ServiceCardProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{service.name}</h3>
            <Badge variant={service.is_active ? 'default' : 'outline'}>
              {service.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{service.category ?? 'Other'}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger nativeButton={false} render={<div className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-muted" aria-label="Service actions"><MoreHorizontal className="h-4 w-4" /></div>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggle} disabled={isActionPending}>
              {service.is_active ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
              disabled={isActionPending}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-medium">{formatServiceDuration(service.duration_minutes)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="font-medium">{formatServicePrice(service.price)}</p>
        </div>
      </div>

      {service.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/services/${service.id}`)}>
          View Details
        </Button>
      </div>
    </div>
  )
}

