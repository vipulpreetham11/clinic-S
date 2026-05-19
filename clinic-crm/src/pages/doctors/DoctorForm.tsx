import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Upload, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Skeleton } from '@/components/ui/skeleton'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { WorkingDaysSelector } from '@/components/doctors/WorkingDaysSelector'
import { TimeRangePicker } from '@/components/doctors/TimeRangePicker'
import { BreakManager } from '@/components/doctors/BreakManager'
import { ServiceAssignment } from '@/components/doctors/ServiceAssignment'
import { useAuthContext } from '@/context/AuthContext'
import { useCreateDoctor, useDoctor, useUpdateDoctor } from '@/hooks/useDoctors'
import { generateAvailableSlots } from '@/lib/slotGenerator'
import type { DoctorBreak } from '@/api/doctors'

const doctorSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  working_days: z.array(z.string()).min(1, 'Select at least one working day'),
  arrival_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  departure_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  slot_duration: z.number().int().refine((val) => [15, 20, 30, 45, 60].includes(val), 'Invalid slot duration'),
  max_appointments_per_day: z.number().int().min(5).max(50),
  // service_ids optional — doctors can be assigned services later
  service_ids: z.array(z.string()).default([]),
}).refine((data) => data.arrival_time < data.departure_time, {
  message: 'Arrival time must be before departure time',
  path: ['departure_time'],
})

type DoctorFormValues = z.infer<typeof doctorSchema>

const SLOT_OPTIONS = [15, 20, 30, 45, 60]

export default function DoctorForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { clinic, isRole } = useAuthContext()

  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor()
  const { data: doctor, isLoading } = useDoctor(id)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localBreaks, setLocalBreaks] = useState<DoctorBreak[]>([])

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema) as any,
    defaultValues: {
      name: '',
      specialization: '',
      qualification: '',
      phone: '',
      photo_url: '',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      arrival_time: '09:00',
      departure_time: '18:00',
      slot_duration: 30,
      max_appointments_per_day: 20,
      service_ids: [],
    },
  })

  const watchedValues = form.watch()

  useEffect(() => {
    if (doctor) {
      form.reset({
        name: doctor.name,
        specialization: doctor.specialization ?? '',
        qualification: doctor.qualification ?? '',
        phone: doctor.phone ?? '',
        photo_url: doctor.photo_url ?? '',
        working_days: doctor.working_days ?? [],
        arrival_time: doctor.arrival_time,
        departure_time: doctor.departure_time,
        slot_duration: doctor.slot_duration,
        max_appointments_per_day: doctor.max_appointments_per_day,
        service_ids: doctor.services?.map((s) => s.id) ?? [],
      })
      setPhotoPreview(doctor.photo_url ?? null)
      setLocalBreaks(doctor.breaks ?? [])
    }
  }, [doctor, form])

  if (!isRole('admin', 'clinic_admin')) {
    return (
      <div className="space-y-6">
        <PageHeader title="Doctor Profile" description="Admin access required" />
        <p className="text-sm text-muted-foreground">You do not have permission to edit doctors.</p>
        <Button variant="outline" onClick={() => navigate('/doctors')}>Go back</Button>
      </div>
    )
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-40 w-full" />
            ))}
          </div>
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    )
  }

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file)
    if (file) {
      setPhotoPreview(URL.createObjectURL(file))
    }
  }


  async function uploadPhoto(file: File) {
    if (!clinic?.id) return null
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `doctor-${Date.now()}.${fileExt}`
    const filePath = `${clinic.id}/${fileName}`

    const { error } = await supabase.storage.from('doctor-photos').upload(filePath, file, {
      upsert: true,
    })
    if (error) throw error

    const { data } = supabase.storage.from('doctor-photos').getPublicUrl(filePath)
    return data.publicUrl
  }

  const previewSlots = useMemo(() => {
    const date = format(new Date(), 'yyyy-MM-dd')
    const breaks = (isEdit ? doctor?.breaks : localBreaks) ?? []
    return generateAvailableSlots({
      doctor: {
        arrival_time: watchedValues.arrival_time,
        departure_time: watchedValues.departure_time,
        slot_duration: watchedValues.slot_duration,
        working_days: watchedValues.working_days,
      },
      breaks: breaks.map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
      existingAppointments: [],
      blockedDates: [],
      date,
    }).slice(0, 12)
  }, [watchedValues.arrival_time, watchedValues.departure_time, watchedValues.slot_duration, watchedValues.working_days, localBreaks, doctor, isEdit])

  async function onSubmit(values: DoctorFormValues) {
    if (!clinic?.id) return
    setIsSubmitting(true)

    try {
      let photoUrl: string | undefined = values.photo_url
      if (photoFile) {
        photoUrl = (await uploadPhoto(photoFile)) || undefined
      }

      const payload = {
        ...values,
        clinic_id: clinic.id,
        photo_url: photoUrl || undefined,
      }

      if (isEdit && id) {
        await updateDoctor.mutateAsync({ id, data: payload })
        toast.success('Doctor updated successfully')
      } else {
        const created = await createDoctor.mutateAsync(payload)

        if (localBreaks.length > 0) {
          await Promise.all(
            localBreaks.map((b) =>
              supabase.from('doctor_breaks').insert({
                doctor_id: created.id,
                label: b.label,
                start_time: b.start_time,
                end_time: b.end_time,
              })
            )
          )
        }

        navigate(`/doctors/${created.id}/schedule`, { replace: true })
        toast.success('Doctor added! Set up their schedule')
      }
    } catch (error: any) {
      console.error('[DoctorForm] onSubmit error:', error)
      toast.error('Failed to save doctor', { description: error?.message ?? 'Something went wrong' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit Doctor - ${doctor?.name ?? ''}` : 'Add New Doctor'}
        description={isEdit ? 'Update doctor details and schedule' : 'Set up a new doctor profile'}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Doctor'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-24 w-24 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Doctor" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl">👤</span>
                      )}
                    </div>
                    <label className="text-xs text-muted-foreground" htmlFor="photo-upload">
                      JPG, PNG max 2MB
                    </label>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById('photo-upload')?.click()} type="button">
                      <Upload className="mr-1 h-4 w-4" />
                      Upload Photo
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Priya Sharma" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="specialization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialization</FormLabel>
                          <FormControl>
                            <Input placeholder="Dentist" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="qualification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Qualification</FormLabel>
                          <FormControl>
                            <Input placeholder="BDS, MDS" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Working Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Working Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="working_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Days *</FormLabel>
                      <FormControl>
                        <WorkingDaysSelector value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Clinic Hours</Label>
                  <TimeRangePicker
                    arrivalTime={watchedValues.arrival_time}
                    departureTime={watchedValues.departure_time}
                    onArrivalChange={(value) => form.setValue('arrival_time', value)}
                    onDepartureChange={(value) => form.setValue('departure_time', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Slot Duration</Label>
                  <div className="flex flex-wrap gap-2">
                    {SLOT_OPTIONS.map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={watchedValues.slot_duration === opt ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => form.setValue('slot_duration', opt)}
                      >
                        {opt} min
                      </Button>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="max_appointments_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Appointments Per Day</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={5}
                            max={50}
                            step={1}
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-xs text-muted-foreground">{field.value} appointments per day</div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Break Times */}
            <Card>
              <CardHeader>
                <CardTitle>Break Times</CardTitle>
              </CardHeader>
              <CardContent>
                <BreakManager
                  doctorId={isEdit ? doctor?.id : undefined}
                  breaks={isEdit ? doctor?.breaks ?? [] : localBreaks}
                  arrivalTime={watchedValues.arrival_time}
                  departureTime={watchedValues.departure_time}
                  onBreaksChange={isEdit ? undefined : setLocalBreaks}
                />
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle>Services This Doctor Offers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {clinic?.id && (
                  <FormField
                    control={form.control}
                    name="service_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ServiceAssignment
                            clinicId={clinic.id}
                            selectedServiceIds={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <p className="text-xs text-muted-foreground">Services must be created in the Services page first.</p>
                <Link to="/services" className="text-xs text-primary underline underline-offset-4">Go to Services</Link>
              </CardContent>
            </Card>

            {/* Portal Access — requires admin backend; contact your administrator to set up doctor portal login */}
          </form>
        </Form>

        {/* Preview */}
        <div className="hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Schedule Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-semibold">Dr. {watchedValues.name || 'Doctor Name'}</p>
                <p className="text-xs text-muted-foreground">
                  {watchedValues.working_days?.length
                    ? `${watchedValues.working_days.join(', ')} · ${watchedValues.arrival_time} - ${watchedValues.departure_time}`
                    : 'Set working days and hours'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available slots today</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewSlots.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No slots available</span>
                  ) : (
                    previewSlots.map((slot) => (
                      <span key={slot} className="rounded-md border px-2 py-1 text-xs">
                        {slot}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>Max {watchedValues.max_appointments_per_day} appointments/day</p>
                <p>{watchedValues.slot_duration} min per slot</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
