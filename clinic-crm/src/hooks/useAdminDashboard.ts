import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/context/AuthContext'
import {
  getTodayStats,
  getTodayAppointments,
  getDoctorStatusToday,
  getWeeklyTrend,
  getRecentActivity,
} from '@/api/adminDashboard'

export function useTodayStats() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['today-stats', clinic?.id],
    queryFn: () => getTodayStats(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useTodayAppointments() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['today-appointments', clinic?.id],
    queryFn: () => getTodayAppointments(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 30,
  })

  // Real-time subscription
  useEffect(() => {
    if (!clinic?.id) return
    const channel = supabase
      .channel('dashboard-appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `clinic_id=eq.${clinic.id}`,
      }, () => {
        queryClient.invalidateQueries({ 
          queryKey: ['today-appointments'] 
        })
        queryClient.invalidateQueries({ 
          queryKey: ['today-stats'] 
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clinic?.id, queryClient])

  return query
}

export function useDoctorStatusToday() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['doctor-status-today', clinic?.id],
    queryFn: () => getDoctorStatusToday(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useWeeklyTrend() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['weekly-trend', clinic?.id],
    queryFn: () => getWeeklyTrend(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 60 * 10,
  })
}

export function useRecentActivity() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['recent-activity', clinic?.id],
    queryFn: () => getRecentActivity(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 60,
  })
}
