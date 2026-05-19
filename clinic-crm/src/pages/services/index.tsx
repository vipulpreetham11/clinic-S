import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, MoreHorizontal, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddServiceModal, EditServiceModal } from '@/components/services/AddServiceModal'
import {
  ServiceCard,
  formatServiceDuration,
  formatServicePrice,
} from '@/components/services/ServiceCard'
import {
  useDeleteService,
  useServices,
  useToggleServiceStatus,
  useUpsertService,
  type ServiceFilter,
} from '@/hooks/useServices'
import type { Service, ServiceUpsertInput } from '@/types'

export default function ServicesList() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceFilter>('all')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<Service | null>(null)

  const { data: services = [], isLoading } = useServices({
    search,
    status: statusFilter,
    includeInactive: true,
  })
  const upsertService = useUpsertService()
  const toggleServiceStatus = useToggleServiceStatus()
  const deleteService = useDeleteService()

  const togglingServiceId = toggleServiceStatus.variables?.id
  const deletingServiceId = deleteService.variables

  const hasServices = services.length > 0
  const isMutating = upsertService.isPending || toggleServiceStatus.isPending || deleteService.isPending

  const emptyStateDescription = useMemo(() => {
    if (search.trim() || statusFilter !== 'all') {
      return 'Try changing the search text or status filter.'
    }
    return 'Create services that patients can book.'
  }, [search, statusFilter])

  async function handleCreate(values: ServiceUpsertInput) {
    await upsertService.mutateAsync(values)
  }

  async function handleUpdate(id: string, values: ServiceUpsertInput) {
    await upsertService.mutateAsync({ ...values, id })
  }

  function handleToggle(service: Service) {
    toggleServiceStatus.mutate({
      id: service.id,
      isActive: !service.is_active,
    })
  }

  function handleDeleteConfirm() {
    if (!deleteServiceTarget) return

    deleteService.mutate(deleteServiceTarget.id, {
      onSuccess: () => setDeleteServiceTarget(null),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage clinic treatments and pricing"
        action={
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by service name or category"
            className="pl-8"
            aria-label="Search services"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ServiceFilter)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter services by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <>
          <div className="grid gap-3 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>

          <div className="hidden rounded-2xl border border-slate-100 shadow-sm md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : !hasServices ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No services found"
          description={emptyStateDescription}
          action={
            !(search.trim() || statusFilter !== 'all') ? (
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={() => setEditService(service)}
                onToggle={() => handleToggle(service)}
                onDelete={() => setDeleteServiceTarget(service)}
                isActionPending={isMutating && (togglingServiceId === service.id || deletingServiceId === service.id)}
              />
            ))}
          </div>

          <div className="hidden rounded-2xl border border-slate-100 shadow-sm md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      <Link to={`/services/${service.id}`} className="hover:text-primary">
                        {service.name}
                      </Link>
                    </TableCell>
                    <TableCell>{service.category ?? 'Other'}</TableCell>
                    <TableCell>{formatServiceDuration(service.duration_minutes)}</TableCell>
                    <TableCell>{formatServicePrice(service.price)}</TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'default' : 'outline'}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          nativeButton={false}
                          render={
                            <div
                              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-muted"
                              aria-label="Service actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </div>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditService(service)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggle(service)}
                            disabled={isMutating && togglingServiceId === service.id}
                          >
                            {service.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteServiceTarget(service)}
                            disabled={isMutating && deletingServiceId === service.id}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AddServiceModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleCreate}
        isSubmitting={upsertService.isPending}
      />

      <EditServiceModal
        open={!!editService}
        onOpenChange={(open) => !open && setEditService(null)}
        service={editService}
        onSubmit={handleUpdate}
        isSubmitting={upsertService.isPending}
      />

      <ConfirmDialog
        open={!!deleteServiceTarget}
        onOpenChange={(open) => !open && setDeleteServiceTarget(null)}
        title="Delete Service"
        description={`Are you sure you want to delete "${deleteServiceTarget?.name ?? 'this service'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteService.isPending}
      />
    </div>
  )
}

