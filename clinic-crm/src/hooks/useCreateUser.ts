import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invokeCreateUser, type CreateUserInput } from '@/api/createUser'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateUserInput) => invokeCreateUser(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['clinic-users'] })
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', variables.clinic_id] })
      queryClient.invalidateQueries({ queryKey: ['clinic-stats', variables.clinic_id] })
    },
    onError: (error: Error) => {
      toast.error('Failed to create user', { description: error.message })
    },
  })
}
