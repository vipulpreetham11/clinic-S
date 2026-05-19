import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getServices } from '@/api/services'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceAssignmentProps {
  clinicId: string
  selectedServiceIds: string[]
  onChange: (ids: string[]) => void
  readOnly?: boolean
}

export function ServiceAssignment({ clinicId, selectedServiceIds, onChange, readOnly }: ServiceAssignmentProps) {
  const [search, setSearch] = useState('')

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', clinicId],
    queryFn: () => getServices(clinicId),
    enabled: !!clinicId,
  })

  const activeServices = useMemo(() => services.filter((svc: Service) => svc.is_active), [services])

  const filtered = useMemo(() => {
    if (!search) return activeServices
    return activeServices.filter((svc: Service) =>
      svc.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [activeServices, search])

  function toggleService(id: string) {
    if (readOnly) return
    if (selectedServiceIds.includes(id)) {
      onChange(selectedServiceIds.filter((s) => s !== id))
    } else {
      onChange([...selectedServiceIds, id])
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (activeServices.length === 0) {
    return (
      <EmptyState
        title="No services created"
        description="Services must be created before assigning them to doctors."
        action={
          <Link to="/services" className="text-sm text-primary underline underline-offset-4">
            Go to Services
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search services..."
        aria-label="Search services"
        disabled={readOnly}
      />
      <div className="space-y-2">
        {filtered.map((svc: Service) => {
          const checked = selectedServiceIds.includes(svc.id)
          return (
            <label
              key={svc.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors',
                checked ? 'border-primary/40 bg-primary/5' : 'border-border',
                readOnly && 'opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={checked} onCheckedChange={() => toggleService(svc.id)} disabled={readOnly} />
                <div>
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.duration_minutes} min</p>
                </div>
              </div>
              {svc.price != null && <span className="text-xs text-muted-foreground">₹{svc.price}</span>}
            </label>
          )
        })}
      </div>
    </div>
  )
}
