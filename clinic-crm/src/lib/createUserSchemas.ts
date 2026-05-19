import { z } from 'zod'

const workingDaysSchema = z.array(z.string()).min(1, 'Select at least one working day')

export const addDoctorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  arrival_time: z.string().min(1),
  departure_time: z.string().min(1),
  slot_duration: z
    .number()
    .int()
    .refine((v) => [15, 20, 30, 45, 60].includes(v), { message: 'Invalid slot duration' }),
  working_days: workingDaysSchema,
  max_appointments_per_day: z.number().int().min(1).max(100),
})

export const addTeamUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'receptionist']),
  phone: z.string().optional(),
})

export type AddDoctorFormValues = z.infer<typeof addDoctorSchema>
export type AddTeamUserFormValues = z.infer<typeof addTeamUserSchema>

export const WORKING_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
