import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ServiceForm } from '@/components/services/ServiceForm'
import type { Service, ServiceUpsertInput } from '@/types'

interface AddServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ServiceUpsertInput) => Promise<void>
  isSubmitting?: boolean
}

interface EditServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSubmit: (id: string, values: ServiceUpsertInput) => Promise<void>
  isSubmitting?: boolean
}

function ServiceModal({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  defaultValues?: Partial<ServiceUpsertInput>
  onSubmit: (values: ServiceUpsertInput) => Promise<void>
  isSubmitting?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ServiceForm
          defaultValues={defaultValues}
          onSubmit={async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          }}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}

export function AddServiceModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddServiceModalProps) {
  return (
    <ServiceModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Service"
      description="Create a new service for this clinic."
      submitLabel="Add Service"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      defaultValues={{ is_active: true }}
    />
  )
}

export function EditServiceModal({
  open,
  onOpenChange,
  service,
  onSubmit,
  isSubmitting,
}: EditServiceModalProps) {
  if (!service) return null

  return (
    <ServiceModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Service"
      description="Update service details."
      submitLabel="Save Changes"
      defaultValues={{
        name: service.name,
        category: service.category ?? 'Other',
        description: service.description ?? '',
        duration_minutes: service.duration_minutes,
        price: service.price ?? 0,
        is_active: service.is_active,
      }}
      onSubmit={(values) => onSubmit(service.id, values)}
      isSubmitting={isSubmitting}
    />
  )
}
