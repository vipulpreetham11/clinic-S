import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { WaitlistEntry, WaitlistNotification } from '../types/waitlist'
import { toast } from 'sonner'

export function useWaitlist(clinicId: string | undefined, filters?: { doctor_id?: string, date?: string, priority?: string, status?: string }) {
  return useQuery({
    queryKey: ['waitlist', clinicId, filters],
    queryFn: async () => {
      if (!clinicId) return []

      let query = supabase
        .from('waitlist')
        .select(`
          *,
          patients(name, phone, email),
          doctors(name),
          services(name)
        `)
        .eq('clinic_id', clinicId)
        .order('position', { ascending: true })

      if (filters?.doctor_id && filters.doctor_id !== 'all') {
        query = query.eq('doctor_id', filters.doctor_id)
      }
      if (filters?.date) {
        query = query.eq('preferred_date', filters.date)
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', parseInt(filters.priority))
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as WaitlistEntry[]
    },
    enabled: !!clinicId,
  })
}

export function useAddToWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Partial<WaitlistEntry>) => {
      const { error } = await supabase
        .from('waitlist')
        .insert([entry])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      toast.success('Added to waitlist successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useNotifyWaitlistEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, message, channel }: { id: string, message: string, channel: string }) => {
      // Stub: in reality, this would hit whatsapp-send
      console.log(`Sending Waitlist notification via ${channel}: ${message}`)
      
      const { error } = await supabase
        .from('waitlist')
        .update({ 
          status: 'notified',
          notified_at: new Date().toISOString(),
          notified_channel: channel
        })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      toast.success('Patient notified successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useBookFromWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ waitlistId, appointmentId }: { waitlistId: string, appointmentId: string }) => {
      const { error } = await supabase
        .from('waitlist')
        .update({ 
          status: 'booked',
          booked_appointment_id: appointmentId 
        })
        .eq('id', waitlistId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
      toast.success('Waitlist entry marked as booked')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useWaitlistNotifications(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['waitlist_notifications', clinicId],
    queryFn: async () => {
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('waitlist_notifications')
        .select(`
          *,
          waitlist:waitlist_id(
            id,
            patients(name, phone)
          ),
          doctors(name)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WaitlistNotification[]
    },
    enabled: !!clinicId,
  })
}

export function useReorderWaitlist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string, position: number }[]) => {
      // In a real prod scenario, you'd want an RPC or a bulk update mechanism.
      // For now, we update them one by one.
      for (const update of updates) {
        const { error } = await supabase
          .from('waitlist')
          .update({ position: update.position })
          .eq('id', update.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateWaitlistStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, priority }: { id: string, status?: string, priority?: number }) => {
      const payload: any = {}
      if (status !== undefined) payload.status = status
      if (priority !== undefined) payload.priority = priority

      const { error } = await supabase
        .from('waitlist')
        .update(payload)
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}
