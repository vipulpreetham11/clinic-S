import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ReminderRule, ReminderQueue, ReminderLog } from '../types/reminder'
import { toast } from 'sonner'

export function useReminderQueue(clinicId: string | undefined, statusFilter?: string, channelFilter?: string) {
  return useQuery({
    queryKey: ['reminder_queue', clinicId, statusFilter, channelFilter],
    queryFn: async () => {
      if (!clinicId) return []

      let query = supabase
        .from('reminder_queue')
        .select(`
          *,
          patients(name, phone, email),
          appointments(date, start_time, notes),
          reminder_rules(name, channel)
        `)
        .eq('clinic_id', clinicId)
        .order('scheduled_at', { ascending: false })
      
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      if (channelFilter && channelFilter !== 'all') {
        query = query.eq('channel', channelFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ReminderQueue[]
    },
    enabled: !!clinicId,
  })
}

export function useReminderRules(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['reminder_rules', clinicId],
    queryFn: async () => {
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ReminderRule[]
    },
    enabled: !!clinicId,
  })
}

export function useReminderLogs(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['reminder_logs', clinicId],
    queryFn: async () => {
      if (!clinicId) return []

      const { data, error } = await supabase
        .from('reminder_logs')
        .select(`
          *,
          patients(name, phone)
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as ReminderLog[]
    },
    enabled: !!clinicId,
  })
}

export function useRetryReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminder_queue')
        .update({ status: 'pending', error_message: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_queue'] })
      toast.success('Reminder queued for retry')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useCancelReminder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminder_queue')
        .update({ status: 'cancelled' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_queue'] })
      toast.success('Reminder cancelled')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useUpsertRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rule: Partial<ReminderRule>) => {
      if (rule.id) {
        const { error } = await supabase
          .from('reminder_rules')
          .update(rule)
          .eq('id', rule.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reminder_rules')
          .insert([rule])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_rules'] })
      toast.success('Rule saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminder_rules')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder_rules'] })
      toast.success('Rule deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}

export function useTestRule() {
  return useMutation({
    mutationFn: async ({ rule, phone, clinicId }: { rule: ReminderRule, phone: string, clinicId: string }) => {
      // Create a temporary conversation if using WhatsApp
      if (rule.channel.includes('whatsapp')) {
        let convId: string | undefined;
        const { data: conv } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('patient_phone', phone)
          .single()
        
        convId = conv?.id
        if (!convId) {
          const { data: newConv, error: convError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              clinic_id: clinicId,
              patient_phone: phone,
              patient_name: 'Test Patient',
              status: 'open'
            }).select().single()
          
          if (convError) throw convError
          convId = newConv.id
        }

        const msg = `[TEST] ${rule.message_template}`
        
        // This is a bit of a hack to call the edge function directly from the client just for testing.
        const { error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            conversation_id: convId,
            content: msg,
            clinic_id: clinicId
          }
        })
        if (error) throw error
      } else {
        console.log(`Test stub for non-whatsapp channel: ${phone} -> ${rule.message_template}`)
      }
    },
    onSuccess: () => {
      toast.success('Test message sent')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
}
