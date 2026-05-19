import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import * as servicesApi from '@/api/services'
import type { Service, ServiceUpsertInput } from '@/types'

export type ServiceFilter = 'all' | 'active' | 'inactive'

interface UseServicesOptions {
  search?: string
  status?: ServiceFilter
  includeInactive?: boolean
}

function useActiveClinicId() {
  const { clinic } = useAuthContext()
  const { clinicId } = useParams<{ clinicId?: string }>()
  const [searchParams] = useSearchParams()

  return clinic?.id ?? clinicId ?? searchParams.get('clinic_id') ?? ''
}

export function useServices(options: UseServicesOptions = {}) {
  const clinicId = useActiveClinicId()
  const status = options.status ?? (options.includeInactive ? 'all' : 'active')

  return useQuery({
    queryKey: ['services', clinicId, options.search ?? '', status],
    queryFn: () =>
      servicesApi.getServices(clinicId, {
        search: options.search,
        status,
      }),
    enabled: !!clinicId,
  })
}

export function useService(serviceId: string | undefined) {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['service', clinicId, serviceId],
    queryFn: () => servicesApi.getServiceById(clinicId, serviceId!),
    enabled: !!clinicId && !!serviceId,
  })
}

export function useServiceUpcomingAppointments(serviceId: string | undefined) {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['service-appointments', clinicId, serviceId],
    queryFn: () => servicesApi.getServiceUpcomingAppointments(clinicId, serviceId!),
    enabled: !!clinicId && !!serviceId,
  })
}

export function useUpsertService() {
  const queryClient = useQueryClient()
  const clinicId = useActiveClinicId()

  return useMutation({
    mutationFn: async (service: ServiceUpsertInput) => {
      if (!clinicId) throw new Error('Clinic context is missing')
      return servicesApi.upsertService({ ...service, clinic_id: clinicId })
    },
    onSuccess: (service, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', clinicId, service.id] })
      queryClient.invalidateQueries({
        queryKey: ['service-appointments', clinicId, service.id],
      })
      toast.success(variables.id ? 'Service updated' : 'Service added')
    },
    onError: (error: Error) => {
      console.error('[useUpsertService] error:', error)
      toast.error('Failed to save service', { description: error.message })
    },
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  const clinicId = useActiveClinicId()

  return useMutation({
    mutationFn: async (serviceId: string) => {
      if (!clinicId) throw new Error('Clinic context is missing')
      await servicesApi.deleteService(serviceId, clinicId)
      return serviceId
    },
    onSuccess: (serviceId) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.removeQueries({ queryKey: ['service', clinicId, serviceId] })
      queryClient.removeQueries({
        queryKey: ['service-appointments', clinicId, serviceId],
      })
      toast.success('Service deleted')
    },
    onError: (error: Error) => {
      console.error('[useDeleteService] error:', error)
      toast.error('Failed to delete service', { description: error.message })
    },
  })
}

export function useToggleServiceStatus() {
  const queryClient = useQueryClient()
  const clinicId = useActiveClinicId()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!clinicId) throw new Error('Clinic context is missing')
      return servicesApi.toggleService(id, isActive, clinicId)
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['services'] })

      const snapshots = queryClient.getQueriesData<Service[]>({
        queryKey: ['services'],
      })

      snapshots.forEach(([key, data]) => {
        if (!data) return
        queryClient.setQueryData<Service[]>(
          key,
          data.map((service) =>
            service.id === id ? { ...service, is_active: isActive } : service
          )
        )
      })

      const detailKey = ['service', clinicId, id]
      const detailSnapshot = queryClient.getQueryData<Service>(detailKey)
      if (detailSnapshot) {
        queryClient.setQueryData<Service>(detailKey, {
          ...detailSnapshot,
          is_active: isActive,
        })
      }

      return { snapshots, detailSnapshot, detailKey }
    },
    onError: (error: Error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      if (context?.detailSnapshot) {
        queryClient.setQueryData(context.detailKey, context.detailSnapshot)
      }
      toast.error('Failed to update service status', { description: error.message })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      queryClient.invalidateQueries({ queryKey: ['service', clinicId, data.id] })
      queryClient.invalidateQueries({
        queryKey: ['service-appointments', clinicId, data.id],
      })
      toast.success(data.is_active ? 'Service activated' : 'Service deactivated')
    },
  })
}
