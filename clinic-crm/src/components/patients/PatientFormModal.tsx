import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { useCreatePatient, useUpdatePatient } from '@/hooks/usePatients'
import type { Patient } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit Indian mobile number' }),
  email: z.string().email('Invalid email').or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface PatientFormModalProps {
  isOpen: boolean
  onClose: () => void
  patient?: Patient | null
  clinicId?: string
  onCreated?: (patient: Patient) => void
}

export function PatientFormModal({
  isOpen,
  onClose,
  patient,
  clinicId: clinicIdProp,
  onCreated,
}: PatientFormModalProps) {
  const { clinic } = useAuthContext()
  const clinicId = clinicIdProp ?? clinic?.id
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      address: '',
      allergies: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (patient && isOpen) {
      form.reset({
        name: patient.name,
        phone: patient.phone,
        email: patient.email || '',
        date_of_birth: patient.date_of_birth || '',
        gender: patient.gender || '',
        blood_group: patient.blood_group || '',
        address: patient.address || '',
        allergies: patient.allergies || '',
        notes: patient.notes || '',
      })
    } else if (!patient && isOpen) {
      form.reset({
        name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        address: '',
        allergies: '',
        notes: '',
      })
    }
  }, [patient, isOpen, form])

  async function onSubmit(data: FormValues) {
    if (!clinicId) {
      toast.error('Clinic not found')
      return
    }

    try {
      if (patient) {
        await updatePatient.mutateAsync({
          id: patient.id,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          blood_group: data.blood_group || null,
          address: data.address || null,
          allergies: data.allergies || null,
          notes: data.notes || null,
        })
        toast.success('Patient updated successfully')
      } else {
        const created = await createPatient.mutateAsync({
          clinic_id: clinicId,
          is_vip: false,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          blood_group: data.blood_group || null,
          address: data.address || null,
          allergies: data.allergies || null,
          notes: data.notes || null,
        })
        toast.success('Patient added successfully')
        onCreated?.(created as Patient)
      }
      onClose()
    } catch (error: any) {
      console.error('[PatientFormModal] onSubmit error:', error)
      toast.error('Operation failed', { description: error.message })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {patient ? 'Edit Patient' : 'Add New Patient'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {patient ? 'Update patient details below.' : 'Fill in the patient details to add them to your clinic.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* DOB + Gender */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Blood Group */}
            <FormField
              control={form.control}
              name="blood_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Blood Group</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Allergies */}
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Allergies (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="Peanuts, Penicillin..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full address" rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes..." rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPatient.isPending || updatePatient.isPending}
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium"
              >
                {patient ? 'Save Changes' : 'Add Patient'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
