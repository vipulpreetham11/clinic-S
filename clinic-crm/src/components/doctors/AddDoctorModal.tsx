import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthContext } from '@/context/AuthContext'
import { useCreateUser } from '@/hooks/useCreateUser'
import {
  addDoctorSchema,
  WORKING_DAY_OPTIONS,
  type AddDoctorFormValues,
} from '@/lib/createUserSchemas'
import { cn } from '@/lib/utils'

interface AddDoctorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId?: string
  onSuccess?: () => void
}

const SLOT_OPTIONS = [15, 20, 30, 45, 60] as const

const defaultValues: AddDoctorFormValues = {
  name: '',
  email: '',
  password: '',
  specialization: '',
  qualification: '',
  phone: '',
  arrival_time: '09:00',
  departure_time: '18:00',
  slot_duration: 30,
  working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  max_appointments_per_day: 20,
}

export function AddDoctorModal({
  open,
  onOpenChange,
  clinicId: clinicIdProp,
  onSuccess,
}: AddDoctorModalProps) {
  const { clinic } = useAuthContext()
  const clinicId = clinicIdProp ?? clinic?.id
  const createUser = useCreateUser()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<AddDoctorFormValues>({
    resolver: zodResolver(addDoctorSchema),
    defaultValues,
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(defaultValues)
    onOpenChange(next)
  }

  async function onSubmit(values: AddDoctorFormValues) {
    if (!clinicId) {
      toast.error('Clinic not found')
      return
    }

    createUser.mutate(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        role: 'doctor',
        clinic_id: clinicId,
        phone: values.phone,
        specialization: values.specialization,
        qualification: values.qualification,
        working_days: values.working_days,
        arrival_time: values.arrival_time,
        departure_time: values.departure_time,
        slot_duration: values.slot_duration,
        max_appointments_per_day: values.max_appointments_per_day,
      },
      {
        onSuccess: () => {
          toast.success('Doctor added!')
          form.reset(defaultValues)
          onOpenChange(false)
          onSuccess?.()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-2xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-slate-900">Add Doctor</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Creates a login account and doctor profile for this clinic.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Email (login) *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="doctor@clinic.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-9 w-9"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Specialization + Qualification */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Specialization</FormLabel>
                    <FormControl>
                      <Input placeholder="General Physician" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Qualification</FormLabel>
                    <FormControl>
                      <Input placeholder="MBBS, MD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone + Slot Duration */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slot_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Slot Duration</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => v && field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SLOT_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Arrival + Departure */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="arrival_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Arrival Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departure_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Departure Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Max Appointments */}
            <FormField
              control={form.control}
              name="max_appointments_per_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Max Appointments / Day</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || 20)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Working Days — pill toggles */}
            <FormField
              control={form.control}
              name="working_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Working Days</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {WORKING_DAY_OPTIONS.map((day) => {
                      const active = field.value?.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? (field.value ?? []).filter((d) => d !== day)
                              : [...(field.value ?? []), day]
                            field.onChange(next)
                          }}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs cursor-pointer transition-colors',
                            active
                              ? 'bg-teal-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
                          )}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 text-sm"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium"
              >
                {createUser.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Add Doctor'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
