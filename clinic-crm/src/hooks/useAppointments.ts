import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { toast } from 'sonner'
import * as appointmentsApi from '@/api/appointments'
import type { AppointmentFilters } from '@/api/appointments'
import type { AppointmentStatus } from '@/types'

export type { AppointmentFilters }

export function useAppointments(filters: Omit<AppointmentFilters, 'clinicId'>) {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  const effectiveFilters: AppointmentFilters = {
    ...filters,
    clinicId: clinic?.id || '',
  }

  const query = useQuery({
    queryKey: ['appointments', effectiveFilters],
    queryFn: () => appointmentsApi.getAppointments(effectiveFilters),
    enabled: !!clinic?.id,
    staleTime: 1000 * 30,
  })

  useEffect(() => {
    if (!clinic?.id) return

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clinic?.id, queryClient])

  return query
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.getAppointmentById(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: appointmentsApi.createAppointment,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment booked', {
        description: `${data?.patient?.name ?? 'Patient'} — ${data?.service?.name ?? 'Service'} at ${data?.start_time ?? ''}`,
      })
    },
    onError: (error: Error) => {
      toast.error('Booking failed', { description: error.message })
    },
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
      extra,
    }: {
      id: string
      status: AppointmentStatus
      extra?: { cancellationReason?: string; followUpDate?: string; followUpNotes?: string }
    }) => appointmentsApi.updateAppointmentStatus(id, status, extra),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] })
      const snapshots = new Map<unknown, unknown>()
      queryClient.getQueriesData({ queryKey: ['appointments'] }).forEach(([key, data]) => {
        snapshots.set(key, data)
        queryClient.setQueryData(key, (old: any) => {
          if (!old?.data) return old
          return { ...old, data: old.data.map((a: any) => (a.id === id ? { ...a, status } : a)) }
        })
      })
      return { snapshots }
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach((data, key) => queryClient.setQueryData(key as any, data))
      toast.error('Update failed')
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
      const labels: Record<string, string> = {
        completed: 'Marked as completed',
        cancelled: 'Appointment cancelled',
        no_show: 'Marked as no-show',
        confirmed: 'Appointment confirmed',
        rescheduled: 'Appointment rescheduled',
        pending: 'Status updated',
      }
      toast.success(labels[status] ?? 'Updated')
    },
  })
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, date, startTime, endTime }: { id: string; date: string; startTime: string; endTime: string }) =>
      appointmentsApi.rescheduleAppointment(id, date, startTime, endTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
      toast.success('Appointment rescheduled')
    },
    onError: (error: Error) => {
      toast.error('Reschedule failed', { description: error.message })
    },
  })
}

export function useUpdateAppointmentNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      appointmentsApi.updateAppointmentNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
      toast.success('Notes saved')
    },
    onError: (error: Error) => {
      toast.error('Failed to save notes', { description: error.message })
    },
  })
}

export function useBookedSlots(doctorId: string, date: string) {
  return useQuery({
    queryKey: ['booked-slots', doctorId, date],
    queryFn: () => appointmentsApi.getBookedSlots(doctorId, date),
    enabled: !!doctorId && !!date,
    staleTime: 1000 * 10,
  })
}
