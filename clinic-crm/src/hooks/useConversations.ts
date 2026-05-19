import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WhatsAppConversation, ConversationFilter } from '@/types/whatsapp'

export function useConversations(clinicId: string | undefined, filter: ConversationFilter = 'all') {
  return useQuery({
    queryKey: ['whatsapp-conversations', clinicId, filter],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('clinic_id', clinicId!)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as WhatsAppConversation[]
    },
    enabled: !!clinicId,
    staleTime: 1000 * 30,
  })
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('id', conversationId!)
        .single()
      if (error) throw error
      return data as WhatsAppConversation
    },
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  })
}

export function useToggleAI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({
          ai_takeover_enabled: enabled,
          status: enabled ? 'bot_handling' : 'open',
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation'] })
    },
  })
}

export function useMarkResolved() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: 'resolved', ai_takeover_enabled: false })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation'] })
    },
  })
}

export function useAssignConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ assigned_to: userId })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
  })
}

export function useResetUnread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (convId: string) => {
      await supabase.rpc('reset_unread', { conv_id: convId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
  })
}
