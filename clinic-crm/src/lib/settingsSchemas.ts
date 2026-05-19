import { z } from 'zod'

export const clinicProfileSchema = z.object({
  name: z.string().min(2, 'Clinic name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  gstin: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      'Invalid GSTIN format'
    ),
  default_slot_duration: z.number().min(5).max(120),
  currency: z.string().min(1, 'Currency is required'),
})

export const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'doctor', 'receptionist']),
  doctor_id: z.string().optional(),
})

export const invoiceSettingsSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required').max(10),
  default_tax: z.number().min(0).max(100),
  footer_text: z.string().optional(),
  show_gstin: z.boolean(),
  payment_terms: z.string().optional(),
})
