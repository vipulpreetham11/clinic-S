import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import * as doctorsApi from '@/api/doctors'
import type { CreateDoctorInput } from '@/api/doctors'

export function useDoctors() {
  const { clinic, profile } = useAuthContext()
  const clinicId = clinic?.id ?? profile?.clinic_id ?? null

  return useQuery({
    queryKey: ['doctors', clinicId],
    queryFn: () => doctorsApi.getDoctors(clinicId!),
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: () => doctorsApi.getDoctorById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.createDoctor,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor added', {
        description: `${data?.name ?? 'Doctor'} has been added successfully.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to add doctor', { description: error.message })
    },
  })
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDoctorInput> }) =>
      doctorsApi.updateDoctor(id, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctor', data.id] })
      toast.success('Doctor updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update doctor', { description: error.message })
    },
  })
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.deleteDoctor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor deleted')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete doctor', { description: error.message })
    },
  })
}

export function useToggleDoctorStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      doctorsApi.toggleDoctorStatus(id, isActive),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctor', data.id] })
      toast.success(data.is_active ? 'Doctor activated' : 'Doctor deactivated')
    },
    onError: (error: Error) => {
      toast.error('Failed to update status', { description: error.message })
    },
  })
}

export function useAddDoctorBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.addDoctorBreak,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctor_id] })
      toast.success('Break added')
    },
    onError: (error: Error) => {
      toast.error('Failed to add break', { description: error.message })
    },
  })
}

export function useUpdateDoctorBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<doctorsApi.DoctorBreak> }) =>
      doctorsApi.updateDoctorBreak(id, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', data.doctor_id] })
      toast.success('Break updated')
    },
    onError: (error: Error) => {
      toast.error('Failed to update break', { description: error.message })
    },
  })
}

export function useDeleteDoctorBreak() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.deleteDoctorBreak,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor'] })
      toast.success('Break deleted')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete break', { description: error.message })
    },
  })
}

export function useDoctorLeaves(doctorId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['doctor-leaves', doctorId, year, month],
    queryFn: () => doctorsApi.getDoctorLeaves(doctorId, year, month),
    enabled: !!doctorId,
  })
}

export function useAddDoctorLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.addDoctorLeave,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves', variables.doctor_id] })
      toast.success('Leave added successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to add leave', { description: error.message })
    },
  })
}

export function useDeleteDoctorLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.deleteDoctorLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves'] })
      toast.success('Leave deleted')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete leave', { description: error.message })
    },
  })
}

export function useDoctorStats(doctorId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['doctor-stats', doctorId, fromDate, toDate],
    queryFn: () => doctorsApi.getDoctorStats(doctorId, fromDate, toDate),
    enabled: !!doctorId && !!fromDate && !!toDate,
    staleTime: 1000 * 30,
  })
}

export function useDoctorAppointmentsByMonth(doctorId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['doctor-appointments', doctorId, year, month],
    queryFn: () => doctorsApi.getDoctorAppointmentsByMonth(doctorId, year, month),
    enabled: !!doctorId,
    staleTime: 1000 * 30,
  })
}

export function useDoctorAppointmentsByDate(doctorId: string, date: string) {
  return useQuery({
    queryKey: ['doctor-appointments-date', doctorId, date],
    queryFn: () => doctorsApi.getDoctorAppointmentsByDate(doctorId, date),
    enabled: !!doctorId && !!date,
    staleTime: 1000 * 30,
  })
}

export function useDoctorAppointmentsInRange(doctorId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['doctor-appointments-range', doctorId, fromDate, toDate],
    queryFn: () => doctorsApi.getDoctorAppointmentsInRange(doctorId, fromDate, toDate),
    enabled: !!doctorId && !!fromDate && !!toDate,
  })
}

export function useDoctorAppointmentCount(doctorId: string) {
  return useQuery({
    queryKey: ['doctor-appointment-count', doctorId],
    queryFn: () => doctorsApi.getDoctorAppointmentCount(doctorId),
    enabled: !!doctorId,
  })
}

export function useDoctorBlockedDates(doctorId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['doctor-blocked-dates', doctorId, year, month],
    queryFn: () => doctorsApi.getBlockedDatesForDoctor(doctorId, year, month),
    enabled: !!doctorId,
  })
}

export function useAddBlockedDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.addBlockedDate,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-blocked-dates', variables.doctor_id] })
      toast.success('Date blocked')
    },
    onError: (error: Error) => {
      toast.error('Failed to block date', { description: error.message })
    },
  })
}

export function useDeleteBlockedDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: doctorsApi.deleteBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-blocked-dates'] })
      toast.success('Blocked date removed')
    },
    onError: (error: Error) => {
      toast.error('Failed to remove block', { description: error.message })
    },
  })
}
