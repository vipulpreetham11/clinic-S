import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as appointmentsApi from '@/api/appointments'
import type { AppointmentStatus } from '@/types'

const RECEPTIONIST_KEYS = [
  ['appointments', 'today'],
  ['receptionist'],
  ['today-appointments'],
  ['today-stats'],
  ['doctor-status-today'],
  ['recent-activity'],
  ['appointments'],
]

export function useAppointmentActions() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
      extra,
    }: {
      id: string
      status: AppointmentStatus
      extra?: { cancellationReason?: string }
    }) => appointmentsApi.updateAppointmentStatus(id, status, extra),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', 'today'] })

      const snapshots: { key: readonly unknown[]; data: unknown }[] = []

      for (const key of RECEPTIONIST_KEYS) {
        queryClient.getQueriesData({ queryKey: key }).forEach(([queryKey, data]) => {
          snapshots.push({ key: queryKey as readonly unknown[], data })
          if (!data) return

          if (Array.isArray(data)) {
            queryClient.setQueryData(queryKey, (data as { id: string; status: string }[]).map((a) =>
              a.id === id ? { ...a, status } : a
            ))
          } else if (typeof data === 'object' && data !== null && 'data' in (data as object)) {
            const old = data as { data: { id: string; status: string }[] }
            queryClient.setQueryData(queryKey, {
              ...old,
              data: old.data.map((a) => (a.id === id ? { ...a, status } : a)),
            })
          }
        })
      }

      return { snapshots }
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(({ key, data }) => queryClient.setQueryData(key, data))
      toast.error('Action failed', { description: 'Could not update appointment. Please try again.' })
    },
    onSuccess: (_data, { status }) => {
      RECEPTIONIST_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
      queryClient.invalidateQueries({ queryKey: ['appointment'] })

      const labels: Record<string, string> = {
        confirmed: 'Patient checked in',
        completed: 'Appointment completed',
        cancelled: 'Appointment cancelled',
        no_show: 'Marked as no-show',
        pending: 'Status updated',
      }
      toast.success(labels[status] ?? 'Updated')
    },
  })

  return {
    checkIn: (id: string) => mutation.mutate({ id, status: 'confirmed' }),
    complete: (id: string) => mutation.mutate({ id, status: 'completed' }),
    cancel: (id: string, cancellationReason: string) =>
      mutation.mutate({ id, status: 'cancelled', extra: { cancellationReason } }),
    noShow: (id: string) => mutation.mutate({ id, status: 'no_show' }),
    isPending: mutation.isPending,
    pendingId: mutation.variables?.id,
  }
}
