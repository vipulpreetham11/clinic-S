import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { ReminderQueue, ReminderFilters } from '@/types/reminder'

/**
 * Hook to fetch reminder queue entries for a clinic
 * Supports filtering by status, channel, and date range
 */
export function useReminderQueue(clinicId: string, filters?: ReminderFilters) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['reminder-queue', clinicId, filters],
    queryFn: async () => {
      let q = supabase
        .from('reminder_queue')
        .select(
          `*,
          patient:patients(id, name, phone),
          appointment:appointments(id, date, start_time, status)`
        )
        .eq('clinic_id', clinicId)
        .order('scheduled_at', { ascending: true })

      // Apply filters
      if (filters?.status) {
        q = q.eq('status', filters.status)
      }
      if (filters?.channel) {
        q = q.eq('channel', filters.channel)
      }
      if (filters?.dateFrom) {
        q = q.gte('scheduled_at', filters.dateFrom)
      }
      if (filters?.dateTo) {
        q = q.lte('scheduled_at', filters.dateTo)
      }
      if (filters?.appointmentId) {
        q = q.eq('appointment_id', filters.appointmentId)
      }
      if (filters?.patientId) {
        q = q.eq('patient_id', filters.patientId)
      }
      if (filters?.ruleId) {
        q = q.eq('rule_id', filters.ruleId)
      }

      const { data, error } = await q
      if (error) throw error
      return (data as ReminderQueue[]) || []
    },
    enabled: !!clinicId,
    staleTime: 1000 * 30,
  })

  // Subscribe to real-time updates for the clinic's reminder queue
  useEffect(() => {
    if (!clinicId) return

    const channel = supabase
      .channel('reminder-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_queue',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminder-queue', clinicId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinicId, queryClient])

  return {
    queue: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook to retry a failed reminder
 * Changes status from 'failed' to 'pending'
 */
export function useRetryReminder() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (reminderId: string) => {
      try {
        const { error } = await supabase
          .from('reminder_queue')
          .update({ status: 'pending', error_message: null })
          .eq('id', reminderId)

        if (error) throw error

        return reminderId
      } catch (error) {
        throw error
      }
    },
    onSuccess: (reminderId) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-queue'] })
      toast.success('Reminder queued for retry')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to retry reminder'
      toast.error(message)
    },
  })

  return {
    retry: mutation.mutate,
    loading: mutation.isPending,
    error: mutation.error,
  }
}

/**
 * Hook to cancel a reminder
 * Changes status to 'cancelled'
 */
export function useCancelReminder() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (reminderId: string) => {
      try {
        const { error } = await supabase
          .from('reminder_queue')
          .update({ status: 'cancelled' })
          .eq('id', reminderId)

        if (error) throw error

        return reminderId
      } catch (error) {
        throw error
      }
    },
    onSuccess: (reminderId) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-queue'] })
      toast.success('Reminder cancelled')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to cancel reminder'
      toast.error(message)
    },
  })

  return {
    cancel: mutation.mutate,
    loading: mutation.isPending,
    error: mutation.error,
  }
}
