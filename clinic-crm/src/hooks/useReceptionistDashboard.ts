import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import {
  getReceptionistTodayStats,
  getReceptionistTodayAppointments,
  getReceptionistDoctorStatus,
  getReceptionistActivityFeed,
} from '@/api/receptionistDashboard'

export function useTodayAppointments(clinicId?: string) {
  const { clinic } = useAuthContext()
  const id = clinicId ?? clinic?.id

  return useQuery({
    queryKey: ['appointments', 'today', id],
    queryFn: () => getReceptionistTodayAppointments(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useTodayStats(clinicId?: string) {
  const { clinic } = useAuthContext()
  const id = clinicId ?? clinic?.id

  return useQuery({
    queryKey: ['receptionist', 'stats', id],
    queryFn: () => getReceptionistTodayStats(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useDoctorStatus(clinicId?: string) {
  const { clinic } = useAuthContext()
  const id = clinicId ?? clinic?.id

  return useQuery({
    queryKey: ['receptionist', 'doctor-status', id],
    queryFn: () => getReceptionistDoctorStatus(id!),
    enabled: !!id,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60,
  })
}

export function useActivityFeed(clinicId?: string) {
  const { clinic } = useAuthContext()
  const id = clinicId ?? clinic?.id

  return useQuery({
    queryKey: ['receptionist', 'activity', id],
    queryFn: () => getReceptionistActivityFeed(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useReceptionistDashboard() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  const stats = useTodayStats()
  const appointments = useTodayAppointments()
  const doctors = useDoctorStatus()
  const activity = useActivityFeed()

  useEffect(() => {
    if (!clinic?.id) return

    const channel = supabase
      .channel('receptionist-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointments', 'today'] })
          queryClient.invalidateQueries({ queryKey: ['receptionist'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'patients',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['receptionist', 'activity'] })
          queryClient.invalidateQueries({ queryKey: ['receptionist', 'stats'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clinic?.id, queryClient])

  return {
    clinicId: clinic?.id,
    stats,
    appointments,
    doctors,
    activity,
    isLoading:
      stats.isLoading ||
      appointments.isLoading ||
      doctors.isLoading ||
      activity.isLoading,
  }
}
