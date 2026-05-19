import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/types'
import { useAuthContext } from '@/context/AuthContext'
import { toast } from 'sonner'

interface UsePatientsParams {
  search?: string
  page?: number
  filters?: {
    gender?: string
    blood_group?: string
    dateRange?: { from: string; to: string }
  }
}

export function usePatients({ search, page = 1, filters }: UsePatientsParams = {}) {
  const { clinic } = useAuthContext()
  const limit = 25

  return useQuery({
    queryKey: ['patients', clinic?.id, search, page, filters],
    queryFn: async () => {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('clinic_id', clinic!.id)
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender)
      }

      if (filters?.blood_group && filters.blood_group !== 'all') {
        query = query.eq('blood_group', filters.blood_group)
      }

      if (filters?.dateRange?.from) {
        query = query.gte('created_at', filters.dateRange.from)
      }
      if (filters?.dateRange?.to) {
        query = query.lte('created_at', filters.dateRange.to)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error
      
      return {
        data: data as Patient[],
        count: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      }
    },
    enabled: !!clinic?.id,
  })
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as Patient
    },
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patient: Omit<Patient, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('patients')
        .insert(patient)
        .select()
        .single()
      if (error) {
        console.error('[useCreatePatient] insert error:', error)
        throw error
      }
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      if (variables.clinic_id) {
        queryClient.invalidateQueries({ queryKey: ['clinic-patients', variables.clinic_id] })
        queryClient.invalidateQueries({ queryKey: ['clinic-stats', variables.clinic_id] })
      }
    },
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) {
        console.error('[useUpdatePatient] update error:', error)
        throw error
      }
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] })
    },
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patients').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] })
      // We are just returning context for toast/undo logic if we implemented a robust undo
      // For now, optimistic invalidate is fine
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
    onError: (err) => {
      toast.error('Failed to delete patient', { description: err.message })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
