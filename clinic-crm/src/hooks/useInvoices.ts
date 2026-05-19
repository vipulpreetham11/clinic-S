import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import * as invoicesApi from '@/api/invoices'
import type { InvoiceFilters, InvoiceStatus, UpsertInvoiceInput } from '@/types/invoice'

function useActiveClinicId() {
  const { clinic } = useAuthContext()
  const { clinicId } = useParams<{ clinicId?: string }>()
  const [searchParams] = useSearchParams()

  return clinic?.id ?? clinicId ?? searchParams.get('clinic_id') ?? ''
}

export function useInvoices(filters: Omit<InvoiceFilters, 'clinicId'>) {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['invoices', clinicId, filters],
    queryFn: () => invoicesApi.getInvoices({ ...filters, clinicId }),
    enabled: !!clinicId,
  })
}

export function useInvoice(invoiceId: string | undefined) {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['invoice', clinicId, invoiceId],
    queryFn: () => invoicesApi.getInvoiceById(clinicId, invoiceId!),
    enabled: !!clinicId && !!invoiceId,
  })
}

export function useInvoiceStats() {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['invoice-stats', clinicId],
    queryFn: () => invoicesApi.getInvoiceStats(clinicId),
    enabled: !!clinicId,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertInvoiceInput) => invoicesApi.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
      toast.success('Invoice created')
    },
    onError: (error: Error) => {
      toast.error('Failed to create invoice', { description: error.message })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertInvoiceInput & { id: string }) => invoicesApi.updateInvoice(payload),
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.clinic_id, variables.id] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
      toast.success('Invoice updated')
    },
    onError: (error: Error) => {
      toast.error('Failed to update invoice', { description: error.message })
    },
  })
}

export function useMarkInvoicePaid() {
  const clinicId = useActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, paymentMethod }: { invoiceId: string; paymentMethod: string }) =>
      invoicesApi.markInvoicePaid(clinicId, invoiceId, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
      toast.success('Invoice marked as paid')
    },
    onError: (error: Error) => {
      toast.error('Failed to mark invoice paid', { description: error.message })
    },
  })
}

export function useCancelInvoice() {
  const clinicId = useActiveClinicId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.cancelInvoice(clinicId, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
      toast.success('Invoice cancelled')
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel invoice', { description: error.message })
    },
  })
}

export function usePatientAppointments(patientId: string | null) {
  const clinicId = useActiveClinicId()

  return useQuery({
    queryKey: ['invoice-patient-appointments', clinicId, patientId],
    queryFn: () => invoicesApi.getPatientAppointments(clinicId, patientId!),
    enabled: !!clinicId && !!patientId,
  })
}

export type { InvoiceStatus }
