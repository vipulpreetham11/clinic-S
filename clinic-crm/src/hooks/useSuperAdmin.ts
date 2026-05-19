import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPlatformStats,
  getAllClinicsWithStats,
  createClinic,
  createClinicAdmin,
  updateClinicStatus,
  deleteClinic,
  getAppointmentsTrend,
  getClinicWithStats,
  getClinicUsers,
  getClinicDoctors,
  getClinicPatients,
  getClinicRecentAppointments,
  toggleUserActive,
  updateClinicInfo,
} from '@/api/superAdmin'
import type { ClinicStatus } from '@/types'

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: getPlatformStats,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
  })
}

export function useAllClinics() {
  return useQuery({
    queryKey: ['all-clinics'],
    queryFn: getAllClinicsWithStats,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
  })
}

export function useClinicWithStats(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-stats', clinicId],
    queryFn: () => getClinicWithStats(clinicId),
    staleTime: 1000 * 60,
    enabled: !!clinicId,
  })
}

export function useAppointmentsTrend(clinicId?: string) {
  return useQuery({
    queryKey: ['appointments-trend', clinicId ?? 'all'],
    queryFn: () => getAppointmentsTrend(clinicId),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  })
}

export function useClinicUsers(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-users', clinicId],
    queryFn: () => getClinicUsers(clinicId),
    staleTime: 1000 * 60,
    enabled: !!clinicId,
  })
}

export function useClinicDoctors(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-doctors', clinicId],
    queryFn: () => getClinicDoctors(clinicId),
    staleTime: 1000 * 60,
    enabled: !!clinicId,
  })
}

export function useClinicPatients(clinicId: string) {
  return useQuery({
    queryKey: ['clinic-patients', clinicId],
    queryFn: () => getClinicPatients(clinicId),
    staleTime: 1000 * 60,
    enabled: !!clinicId,
  })
}

export function useClinicRecentAppointments(clinicId: string, limit = 10) {
  return useQuery({
    queryKey: ['clinic-recent-appointments', clinicId, limit],
    queryFn: () => getClinicRecentAppointments(clinicId, limit),
    staleTime: 1000 * 60,
    enabled: !!clinicId,
  })
}

export function useCreateClinic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create clinic')
    },
  })
}

export function useCreateClinicAdmin() {
  return useMutation({
    mutationFn: createClinicAdmin,
  })
}

export function useUpdateClinicStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      clinicId,
      status,
      reason,
    }: {
      clinicId: string
      status: ClinicStatus
      reason?: string
    }) => updateClinicStatus(clinicId, status, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      queryClient.invalidateQueries({ queryKey: ['clinic-stats', variables.clinicId] })
      toast.success(`Clinic status updated to ${variables.status}`)
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update clinic status')
    },
  })
}

export function useDeleteClinic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (clinicId: string) => deleteClinic(clinicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      toast.success('Clinic deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to delete clinic')
    },
  })
}

export function useToggleUserActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean; clinicId: string }) =>
      toggleUserActive(userId, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clinic-users', variables.clinicId] })
      toast.success(`User ${variables.isActive ? 'activated' : 'deactivated'}`)
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update user status')
    },
  })
}

export function useUpdateClinicInfo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ clinicId, data }: { clinicId: string; data: Parameters<typeof updateClinicInfo>[1] }) =>
      updateClinicInfo(clinicId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['clinic-stats', variables.clinicId] })
      toast.success('Clinic updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update clinic')
    },
  })
}
