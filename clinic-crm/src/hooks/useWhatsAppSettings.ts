import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WhatsAppAIConfig } from '@/types/whatsapp'
import { toast } from 'sonner'

const DEFAULT_SYSTEM_PROMPT = `You are Priya, a helpful clinic receptionist assistant.
You help patients with:
- Booking appointments (collect: preferred date, time, doctor, reason for visit)
- Clinic timings and location
- General FAQs about the clinic and its services

Rules:
- Keep replies SHORT (max 3 sentences). This is WhatsApp, not email.
- Always respond in the same language the patient uses (Telugu, Hindi, English)
- Never give medical advice, diagnoses, or treatment recommendations
- If patient says "emergency", "urgent", "chest pain", "accident" → immediately say: "Please call our emergency number immediately. I'm alerting our staff now." Then stop.
- If unsure about anything, say "Let me connect you with our receptionist who can help better."
- Never make up appointment slots — say "Our receptionist will confirm your slot shortly."
- Tone: warm, helpful, professional. Not robotic.`

export { DEFAULT_SYSTEM_PROMPT }

export function useWhatsAppSettings(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp-ai-config', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_ai_config')
        .select('*')
        .eq('clinic_id', clinicId!)
        .maybeSingle()
      if (error) throw error
      return data as WhatsAppAIConfig | null
    },
    enabled: !!clinicId,
  })
}

export function useSaveWhatsAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: Partial<WhatsAppAIConfig> & { clinic_id: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_ai_config')
        .upsert(config, { onConflict: 'clinic_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-config', vars.clinic_id] })
      toast.success('Settings saved')
    },
    onError: (err: Error) => {
      toast.error('Failed to save settings', { description: err.message })
    },
  })
}
