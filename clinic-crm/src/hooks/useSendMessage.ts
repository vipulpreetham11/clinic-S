import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SendMessageInput {
  conversation_id: string
  content: string
  clinic_id: string
  sender?: string
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ conversation_id, content, clinic_id, sender = 'clinic' }: SendMessageInput) => {
      // Call the whatsapp-send edge function
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversation_id, content, clinic_id, sender }),
        }
      )

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to send message')
      }

      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', vars.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
    onError: (err: Error) => {
      toast.error('Failed to send message', { description: err.message })
    },
  })
}
