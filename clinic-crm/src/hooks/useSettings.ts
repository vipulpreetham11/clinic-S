import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { getClinic } from '@/api/clinics'
import * as settingsApi from '@/api/settings'
import type { ClinicProfileInput, InviteClinicUserInput } from '@/api/settings'
import type { ClinicNotificationSettings, ClinicInvoiceSettings, SettingsUserRole } from '@/types/settings'
import {
  appointmentsToCsv,
  downloadCsv,
  invoicesToCsv,
  patientsToCsv,
} from '@/lib/csvExport'

export function useClinicProfile() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['clinic-profile', clinic?.id],
    queryFn: () => getClinic(clinic!.id),
    enabled: !!clinic?.id,
    staleTime: 1000 * 60,
  })
}

export function useUpdateClinicProfile() {
  const { clinic, refreshClinic } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ClinicProfileInput) =>
      settingsApi.updateClinicProfile(clinic!.id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['clinic-profile', clinic?.id] })
      const previous = queryClient.getQueryData(['clinic-profile', clinic?.id])
      queryClient.setQueryData(['clinic-profile', clinic?.id], (old: unknown) => ({
        ...(old as object),
        ...input,
      }))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['clinic-profile', clinic?.id], ctx.previous)
      toast.error('Failed to save clinic profile')
    },
    onSuccess: async () => {
      await refreshClinic?.()
      queryClient.invalidateQueries({ queryKey: ['clinic-profile'] })
      toast.success('Clinic profile saved')
    },
  })
}

export function useUploadClinicLogo() {
  const { clinic } = useAuthContext()
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadClinicLogo(clinic!.id, file),
    onError: () => toast.error('Logo upload failed'),
    onSuccess: () => toast.success('Logo uploaded'),
  })
}

export function useClinicUsers() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['clinic-users', clinic?.id],
    queryFn: () => settingsApi.getClinicUsers(clinic!.id),
    enabled: !!clinic?.id,
  })
}

export function useClinicDoctorsForLink() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['clinic-doctors-link', clinic?.id],
    queryFn: () => settingsApi.getClinicDoctorsForLink(clinic!.id),
    enabled: !!clinic?.id,
  })
}

export function useInviteUser() {
  const { clinic } = useAuthContext()

  return useMutation({
    mutationFn: (input: Omit<InviteClinicUserInput, 'clinic_id'>) =>
      settingsApi.inviteClinicUser({ ...input, clinic_id: clinic!.id }),
  })
}

export function useSetUserActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      settingsApi.setUserActive(userId, isActive),
    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['clinic-users'] })
      const snapshots = queryClient.getQueriesData({ queryKey: ['clinic-users'] })
      queryClient.setQueriesData({ queryKey: ['clinic-users'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((u: { id: string; is_active: boolean }) =>
          u.id === userId ? { ...u, is_active: isActive } : u
        )
      })
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error('Failed to update user status')
    },
    onSuccess: (_d, { isActive }) => {
      toast.success(isActive ? 'User activated' : 'User deactivated')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['clinic-users'] }),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      role,
      doctorId,
    }: {
      userId: string
      role: SettingsUserRole
      doctorId?: string | null
    }) => settingsApi.updateUserRole(userId, role, doctorId),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['clinic-users'] })
      const snapshots = queryClient.getQueriesData({ queryKey: ['clinic-users'] })
      queryClient.setQueriesData({ queryKey: ['clinic-users'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((u: { id: string; role: string }) =>
          u.id === userId ? { ...u, role } : u
        )
      })
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      toast.error('Failed to change role')
    },
    onSuccess: () => toast.success('Role updated'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['clinic-users'] }),
  })
}

export function useNotificationSettings() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['notification-settings', clinic?.id],
    queryFn: () => settingsApi.getNotificationSettings(clinic!.id),
    enabled: !!clinic?.id,
  })
}

export function useSaveNotificationSettings() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: ClinicNotificationSettings) =>
      settingsApi.saveNotificationSettings(clinic!.id, settings),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: ['notification-settings', clinic?.id] })
      const previous = queryClient.getQueryData(['notification-settings', clinic?.id])
      queryClient.setQueryData(['notification-settings', clinic?.id], settings)
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['notification-settings', clinic?.id], ctx.previous)
      }
      toast.error('Failed to save notification settings')
    },
    onSuccess: () => toast.success('Notification settings saved'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['notification-settings', clinic?.id] }),
  })
}

export function useInvoiceSettings() {
  const { clinic } = useAuthContext()
  return useQuery({
    queryKey: ['invoice-settings', clinic?.id],
    queryFn: () => settingsApi.getInvoiceSettings(clinic!.id),
    enabled: !!clinic?.id,
  })
}

export function useSaveInvoiceSettings() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Omit<ClinicInvoiceSettings, 'clinic_id' | 'updated_at'>) =>
      settingsApi.saveInvoiceSettings(clinic!.id, settings),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: ['invoice-settings', clinic?.id] })
      const previous = queryClient.getQueryData(['invoice-settings', clinic?.id])
      queryClient.setQueryData(['invoice-settings', clinic?.id], (old: unknown) => ({
        ...(old as object),
        ...settings,
      }))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['invoice-settings', clinic?.id], ctx.previous)
      }
      toast.error('Failed to save invoice settings')
    },
    onSuccess: () => toast.success('Invoice settings saved'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['invoice-settings', clinic?.id] }),
  })
}

export function useExportClinicData() {
  const { clinic } = useAuthContext()
  return useMutation({
    mutationFn: async () => {
      const data = await settingsApi.exportClinicData(clinic!.id)
      const stamp = new Date().toISOString().split('T')[0]
      downloadCsv(`patients-${stamp}.csv`, patientsToCsv(data.patients))
      downloadCsv(`appointments-${stamp}.csv`, appointmentsToCsv(data.appointments))
      if (data.invoices.length > 0) {
        downloadCsv(`invoices-${stamp}.csv`, invoicesToCsv(data.invoices))
      }
      return data
    },
    onSuccess: () => toast.success('Data export started — check your downloads'),
    onError: () => toast.error('Export failed'),
  })
}

export function useResetDemoData() {
  const { clinic } = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => settingsApi.resetDemoClinicData(clinic!.id),
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success('Demo data reset complete')
    },
    onError: () => toast.error('Reset failed'),
  })
}
