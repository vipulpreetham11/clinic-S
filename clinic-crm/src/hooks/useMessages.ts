import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WhatsAppMessage } from '@/types/whatsapp'

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as WhatsAppMessage[]
    },
    enabled: !!conversationId,
    staleTime: 1000 * 10,
    refetchInterval: false,
  })
}
