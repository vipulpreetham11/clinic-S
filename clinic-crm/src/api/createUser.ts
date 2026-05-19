import { supabase } from '@/lib/supabase'

export type CreateUserRole = 'admin' | 'receptionist' | 'doctor'

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: CreateUserRole
  clinic_id: string
  phone?: string
  specialization?: string
  qualification?: string
  working_days?: string[]
  arrival_time?: string
  departure_time?: string
  slot_duration?: number
  max_appointments_per_day?: number
}

export interface CreateUserResult {
  user_id: string
  doctor_id: string | null
}

function parseInvokeError(
  error: { message?: string } | null,
  data: unknown
): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error?: string }).error
    if (err) return err
  }
  return error?.message ?? 'Failed to create user'
}

export async function invokeCreateUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: input,
  })

  if (error) {
    throw new Error(parseInvokeError(error, data))
  }

  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error((data as { error: string }).error)
  }

  if (!data?.user_id) {
    throw new Error('Invalid response from create-user function')
  }

  return data as CreateUserResult
}
