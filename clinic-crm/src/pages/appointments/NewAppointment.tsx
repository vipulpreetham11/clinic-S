import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthContext } from '@/context/AuthContext'
import { useCreateAppointment } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { supabase } from '@/lib/supabase'
import { getDoctorsForService } from '@/api/appointments'
import { PageHeader } from '@/components/shared/PageHeader'
import { PatientSearch } from '@/components/appointments/PatientSearch'
import { SlotPicker } from '@/components/appointments/SlotPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import type { Patient, Service } from '@/types'

const schema = z.object({
  patient_id: z.string().optional(),
  patient_name: z.string().min(2, 'Name must be at least 2 characters'),
  patient_phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit Indian mobile number'),
  patient_email: z.string().optional(),
  patient_dob: z.string().optional(),
  patient_gender: z.enum(['male', 'female', 'other']).optional(),
  patient_notes: z.string().optional(),
  service_id: z.string().min(1, 'Please select a service'),
  doctor_id: z.string().min(1, 'Please select a doctor'),
  date: z.string().min(1, 'Please select a date'),
  start_time: z.string().min(1, 'Please select a time slot'),
  end_time: z.string().default(''),
  notes: z.string().optional(),
  source: z.enum(['admin', 'receptionist']),
  send_whatsapp: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function Section({ title, children, collapsible = false }: { title: string; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5 space-y-4">
      <button
        type="button"
        className={`flex items-center justify-between w-full text-left ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {collapsible && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

export default function NewAppointment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clinic, user, isAdmin, isRole } = useAuthContext()
  const createAppointment = useCreateAppointment()
  const { data: services = [], isLoading: servicesLoading } = useServices()

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showNewPatientFields, setShowNewPatientFields] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      source: isAdmin ? 'admin' : 'receptionist',
      send_whatsapp: true,
      end_time: '',
    },
  })

  const watchedServiceId = form.watch('service_id')
  const watchedDoctorId = form.watch('doctor_id')
  const watchedDate = form.watch('date')
  const watchedStartTime = form.watch('start_time')
  const watchedSendWhatsapp = form.watch('send_whatsapp')
  const watchedPhone = form.watch('patient_phone')

  // Load doctors when service changes
  useEffect(() => {
    if (!watchedServiceId) { setFilteredDoctors([]); return }
    setDoctorsLoading(true)
    getDoctorsForService(watchedServiceId)
      .then((doctors) => {
        setFilteredDoctors(doctors.filter((d: any) => d.is_active))
        form.setValue('doctor_id', '')
        form.setValue('date', '')
        form.setValue('start_time', '')
        form.setValue('end_time', '')
      })
      .finally(() => setDoctorsLoading(false))
  }, [watchedServiceId, form])

  // Update selected service object
  useEffect(() => {
    const svc = services.find((s) => s.id === watchedServiceId)
    setSelectedService(svc ?? null)
  }, [watchedServiceId, services])

  // Pre-fill patient from state if available
  useEffect(() => {
    if (location.state?.prefilledPatient && !selectedPatient) {
      handlePatientSelect(location.state.prefilledPatient)
    }
  }, [location.state, selectedPatient])

  // Fill form when patient selected
  function handlePatientSelect(patient: Patient | null) {
    setSelectedPatient(patient)
    if (patient) {
      form.setValue('patient_id', patient.id)
      form.setValue('patient_name', patient.name)
      form.setValue('patient_phone', patient.phone)
      form.setValue('patient_email', patient.email ?? '')
      form.setValue('patient_dob', patient.date_of_birth ?? '')
      form.setValue('patient_gender', (patient.gender as any) ?? undefined)
      form.setValue('patient_notes', patient.notes ?? '')
      setShowNewPatientFields(false)
    } else {
      form.reset({ ...form.getValues(), patient_id: undefined })
    }
  }

  function handleNewPatient() {
    setSelectedPatient(null)
    setShowNewPatientFields(true)
    form.setValue('patient_id', undefined)
    form.setValue('patient_name', '')
    form.setValue('patient_phone', '')
  }

  async function onSubmit(values: FormValues) {
    if (!clinic?.id || !user?.id) return
    setIsSubmitting(true)

    try {
      let patientId = values.patient_id

      if (!patientId) {
        // Check if patient exists by phone
        const { data: existing } = await supabase
          .from('patients')
          .select('id')
          .eq('clinic_id', clinic.id)
          .eq('phone', values.patient_phone)
          .maybeSingle()

        if (existing?.id) {
          patientId = existing.id
          await supabase.from('patients').update({
            name: values.patient_name,
            ...(values.patient_email ? { email: values.patient_email } : {}),
          }).eq('id', patientId)
        } else {
          const { data: newPatient, error: patientError } = await supabase
            .from('patients')
            .insert({
              clinic_id: clinic.id,
              name: values.patient_name,
              phone: values.patient_phone,
              ...(values.patient_email ? { email: values.patient_email } : {}),
              ...(values.patient_dob ? { date_of_birth: values.patient_dob } : {}),
              ...(values.patient_gender ? { gender: values.patient_gender } : {}),
              ...(values.patient_notes ? { notes: values.patient_notes } : {}),
            })
            .select('id')
            .single()

          if (patientError || !newPatient) throw patientError ?? new Error('Failed to create patient')
          patientId = newPatient.id
        }
      }

      const created = await createAppointment.mutateAsync({
        clinic_id: clinic.id,
        doctor_id: values.doctor_id,
        patient_id: patientId!,
        service_id: values.service_id,
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        status: 'pending',
        source: values.source,
        notes: values.notes,
        booked_by: user.id,
      })

      // Navigate to the new appointment's detail page
      navigate(`/appointments/${(created as any)?.id ?? ''}`, { replace: true })
    } catch (error: any) {
      console.error('[NewAppointment] booking error:', error)
      toast.error('Booking failed', { description: error?.message ?? 'Something went wrong' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="New Appointment"
        description="Book a new patient visit"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>

          {/* 1. Service */}
          <Section title="1. Select Service">
            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service *</FormLabel>
                  <FormControl>
                    {servicesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-label="Select service">
                          <SelectValue placeholder="Select a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((svc) => (
                            <SelectItem key={svc.id} value={svc.id}>
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span>{svc.name}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{svc.duration_minutes} min</span>
                                  {svc.price != null && <span>₹{svc.price}</span>}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedService && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{selectedService.duration_minutes} min</Badge>
                {selectedService.price != null && (
                  <Badge variant="outline" className="text-xs">₹{selectedService.price}</Badge>
                )}
              </div>
            )}
          </Section>

          {/* 2. Doctor */}
          {watchedServiceId && (
            <Section title="2. Select Doctor">
              <FormField
                control={form.control}
                name="doctor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor *</FormLabel>
                    <FormControl>
                      {doctorsLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : filteredDoctors.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No doctors available for this service.
                        </p>
                      ) : (
                        <Select value={field.value} onValueChange={(v) => {
                          field.onChange(v)
                          form.setValue('date', '')
                          form.setValue('start_time', '')
                          form.setValue('end_time', '')
                        }}>
                          <SelectTrigger aria-label="Select doctor">
                            <SelectValue placeholder="Select a doctor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredDoctors.map((doc: any) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                <div>
                                  <span className="font-medium">Dr. {doc.name}</span>
                                  {doc.specialization && (
                                    <span className="ml-2 text-xs text-muted-foreground">{doc.specialization}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>
          )}

          {/* 3. Date & Slot */}
          {watchedDoctorId && (
            <Section title="3. Select Date & Time">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <FormControl>
                          <PopoverTrigger render={
                            <Button
                              type="button"
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!field.value && 'text-muted-foreground'}`}
                              aria-label="Select date"
                            >
                              {field.value
                                ? format(parseISO(field.value), 'EEEE, d MMMM yyyy')
                                : 'Pick a date'}
                            </Button>
                          } />
                        </FormControl>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                field.onChange(format(d, 'yyyy-MM-dd'))
                                form.setValue('start_time', '')
                                form.setValue('end_time', '')
                                setDatePickerOpen(false)
                              }
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedDate && clinic?.id && (
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Slot *</FormLabel>
                        <FormControl>
                          <SlotPicker
                            doctorId={watchedDoctorId}
                            clinicId={clinic.id}
                            date={watchedDate}
                            serviceDuration={selectedService?.duration_minutes ?? 30}
                            selectedSlot={field.value}
                            onSlotSelect={(start, end) => {
                              field.onChange(start)
                              form.setValue('end_time', end)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedStartTime && (
                  <p className="text-sm text-muted-foreground">
                    Selected:{' '}
                    <span className="font-medium text-foreground">
                      {(() => {
                        const [h, m] = watchedStartTime.split(':').map(Number)
                        return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
                      })()}
                      {form.watch('end_time') && ` — ${(() => {
                        const [h, m] = (form.watch('end_time') ?? '').split(':').map(Number)
                        return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
                      })()}`}
                    </span>
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* 4. Patient */}
          <Section title="4. Patient Details">
            {clinic?.id && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-1.5 block">Search existing patient</Label>
                  <PatientSearch
                    clinicId={clinic.id}
                    onPatientSelect={handlePatientSelect}
                    onNewPatient={handleNewPatient}
                    selectedPatient={selectedPatient}
                  />
                </div>

                {/* New patient fields */}
                {(!selectedPatient) && (
                  <div className="space-y-3">
                    {showNewPatientFields && (
                      <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
                        Fill in the patient details below to create a new patient record.
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="patient_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Patient full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patient_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="10-digit mobile number" type="tel" maxLength={10} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patient_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="patient_dob"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="patient_gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger aria-label="Select gender">
                                <SelectValue placeholder="Select gender..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patient_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any relevant patient notes..." className="resize-none" rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 5. Additional */}
          <Section title="5. Additional Details" collapsible>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any notes for this appointment..." className="resize-none" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Source</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-label="Booking source">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="send_whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3 rounded-md border p-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Send WhatsApp confirmation"
                        />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium cursor-pointer" onClick={() => field.onChange(!field.value)}>
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            Send WhatsApp Confirmation
                          </div>
                        </FormLabel>
                        {field.value && watchedPhone && (
                          <p className="text-xs text-muted-foreground">
                            Confirmation will be sent to {watchedPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || createAppointment.isPending}
              className="flex-1 sm:flex-none sm:min-w-[160px]"
            >
              {isSubmitting ? 'Booking...' : 'Book Appointment'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
