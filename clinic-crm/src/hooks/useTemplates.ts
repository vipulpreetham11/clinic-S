import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WhatsAppTemplate } from '@/types/whatsapp'
import { toast } from 'sonner'

export function useTemplates(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp-templates', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('clinic_id', clinicId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as WhatsAppTemplate[]
    },
    enabled: !!clinicId,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (template: Omit<WhatsAppTemplate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert(template)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', vars.clinic_id] })
      toast.success('Template saved')
    },
    onError: (err: Error) => {
      toast.error('Failed to save template', { description: err.message })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clinicId }: { id: string; clinicId: string }) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { id, clinicId }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', vars.clinicId] })
      toast.success('Template deleted')
    },
    onError: (err: Error) => {
      toast.error('Failed to delete template', { description: err.message })
    },
  })
}

export function useSeedTemplates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (clinicId: string) => {
      const { error } = await supabase.rpc('seed_whatsapp_templates', { p_clinic_id: clinicId })
      if (error) throw error
    },
    onSuccess: (_data, clinicId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', clinicId] })
    },
  })
}
