import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateClinic, useCreateClinicAdmin } from '@/hooks/useSuperAdmin'
import { cn } from '@/lib/utils'
import type { Clinic } from '@/types'

// ── Schemas ──────────────────────────────────────────────────────────────────

const clinicSchema = z.object({
  name: z.string().min(2, 'Clinic name required'),
  slug: z
    .string()
    .min(2, 'Slug required')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens'),
  primary_color: z.string().default('#2A8C78'),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  opening_time: z.string().default('09:00'),
  closing_time: z.string().default('18:00'),
  working_days: z.array(z.string()).min(1, 'Select at least one working day'),
})

const adminSchema = z
  .object({
    name: z.string().min(2, 'Admin name required'),
    email: z.string().email('Valid email required'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ClinicFormValues = z.infer<typeof clinicSchema>
type AdminFormValues = z.infer<typeof adminSchema>
type Phase = 'idle' | 'creating-clinic' | 'creating-admin' | 'success'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatTimeLabel(value: string) {
  const [hoursRaw, minutes] = value.split(':')
  const hours = Number(hoursRaw)
  if (Number.isNaN(hours)) return value

  const suffix = hours >= 12 ? 'PM' : 'AM'
  const normalizedHours = hours % 12 || 12
  return minutes === '00' ? `${normalizedHours}${suffix}` : `${normalizedHours}:${minutes}${suffix}`
}

function formatWorkingDays(days: string[]) {
  if (days.length <= 1) return days.join(', ')
  const indexes = [...days]
    .map((day) => DAYS.indexOf(day))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
  const isContiguous = indexes.every((value, index) => index === 0 || value === indexes[index - 1] + 1)
  if (isContiguous) return `${DAYS[indexes[0]]}-${DAYS[indexes[indexes.length - 1]]}`
  return days.join(', ')
}

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%'
  const all = upper + lower + digits + special
  let pw =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)]
  for (let i = 0; i < 8; i++) pw += all[Math.floor(Math.random() * all.length)]
  return pw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Weak', color: 'bg-red-500' }
  if (s <= 2) return { score: s, label: 'Fair', color: 'bg-orange-500' }
  if (s <= 3) return { score: s, label: 'Good', color: 'bg-yellow-500' }
  return { score: s, label: 'Strong', color: 'bg-emerald-500' }
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ['Clinic Info', 'Admin Account', 'Review']
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 sm:w-16 mx-2 transition-colors',
                  done ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreateClinic() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutateAsync: createClinicMutation } = useCreateClinic()
  const { mutateAsync: createClinicAdminMutation } = useCreateClinicAdmin()

  const [step, setStep] = useState(1)
  const [clinicData, setClinicData] = useState<ClinicFormValues | null>(null)
  const [adminData, setAdminData] = useState<AdminFormValues | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [slugManual, setSlugManual] = useState(false)
  const [copied, setCopied] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [createdClinic, setCreatedClinic] = useState<Clinic | null>(null)
  const [adminResult, setAdminResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // ── Clinic form ────────────────────────────────────────────────────────────

  const clinicForm = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema) as any,
    defaultValues: {
      name: '',
      slug: '',
      primary_color: '#2A8C78',
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      opening_time: '09:00',
      closing_time: '18:00',
      working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
  })

  const watchedName = clinicForm.watch('name')
  useEffect(() => {
    if (!slugManual && watchedName) {
      clinicForm.setValue('slug', toSlug(watchedName), { shouldValidate: false })
    }
  }, [watchedName, slugManual, clinicForm])

  // ── Admin form ─────────────────────────────────────────────────────────────

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema) as any,
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  const watchedPassword = adminForm.watch('password')
  const strength = getStrength(watchedPassword ?? '')

  const handleGeneratePassword = useCallback(() => {
    const pw = generatePassword()
    adminForm.setValue('password', pw, { shouldValidate: true })
    adminForm.setValue('confirmPassword', pw, { shouldValidate: true })
    setShowPassword(true)
  }, [adminForm])

  // ── Step submit handlers ───────────────────────────────────────────────────

  async function onClinicSubmit(data: ClinicFormValues) {
    setClinicData(data)
    setStep(2)
  }

  async function onAdminSubmit(data: AdminFormValues) {
    setAdminData(data)
    setStep(3)
  }

  async function handleFinalSubmit() {
    if (!clinicData || !adminData) return

    setPhase('creating-clinic')
    setCreatedClinic(null)
    setAdminResult(null)
    setCopied(false)

    try {
      const clinic = await createClinicMutation({
        name: clinicData.name,
        slug: clinicData.slug,
        primary_color: clinicData.primary_color,
        address: clinicData.address || undefined,
        phone: clinicData.phone || undefined,
        whatsapp: clinicData.whatsapp || undefined,
        email: clinicData.email || undefined,
        opening_time: clinicData.opening_time,
        closing_time: clinicData.closing_time,
        working_days: clinicData.working_days,
      })

      setPhase('creating-admin')
      setCreatedClinic(clinic)

      const result = await createClinicAdminMutation({
        clinic_id: clinic.id,
        name: adminData.name,
        email: adminData.email,
        password: adminData.password,
        phone: adminData.phone || undefined,
      })

      setAdminResult({
        success: result.success,
        message: result.message,
      })
      setPhase('success')
      queryClient.invalidateQueries({ queryKey: ['all-clinics'] })
    } catch (error: unknown) {
      setPhase('idle')
      toast.error(error instanceof Error ? error.message : 'Failed to create clinic')
    }
  }

  async function copyCredentials() {
    if (!createdClinic || !adminData || !adminResult?.success) return
    const text = `Clinic: ${createdClinic.name}\nEmail: ${adminData.email}\nPassword: ${adminData.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy credentials')
    }
  }

  // ── Loading overlay ────────────────────────────────────────────────────────

  const isSubmitting = phase === 'creating-clinic' || phase === 'creating-admin'

  if (isSubmitting) {
    const clinicStepIcon = phase === 'creating-clinic' ? '⏳' : '✅'
    const adminStepIcon = phase === 'creating-clinic' ? '○' : '⏳'
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-5">
            <p className="text-sm font-semibold text-foreground">Setting up your clinic...</p>
            <div className="space-y-2 text-sm">
              <p>{clinicStepIcon} Creating clinic profile</p>
              <p>{adminStepIcon} Setting up admin account</p>
              <p>○ Configuring settings</p>
            </div>
            <p className="text-xs text-muted-foreground">Please wait...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const resetWizard = () => {
    setPhase('idle')
    setStep(1)
    setClinicData(null)
    setAdminData(null)
    setCreatedClinic(null)
    setAdminResult(null)
    setCopied(false)
    clinicForm.reset()
    adminForm.reset()
    setSlugManual(false)
  }

  const hoursSummary =
    clinicData &&
    `${formatWorkingDays(clinicData.working_days)}, ${formatTimeLabel(clinicData.opening_time)}-${formatTimeLabel(clinicData.closing_time)}`

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/clinics')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create New Clinic</h1>
            <p className="text-sm text-muted-foreground">Set up a clinic and its admin account</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1 ── */}
        {step === 1 && (
          <Form {...clinicForm}>
            <form onSubmit={clinicForm.handleSubmit(onClinicSubmit)} className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clinic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Name */}
                  <FormField
                    control={clinicForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinic Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Smile Dental Hyderabad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Slug */}
                  <FormField
                    control={clinicForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="smile-dental-hyd"
                            {...field}
                            onChange={(e) => {
                              setSlugManual(true)
                              field.onChange(e.target.value.toLowerCase())
                            }}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Preview: <span className="font-mono">clinicos.app/{field.value}/</span>
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Color */}
                  <FormField
                    control={clinicForm.control}
                    name="primary_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="h-10 w-12 rounded border border-input cursor-pointer p-1"
                            />
                            <Input
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="font-mono w-32"
                              maxLength={7}
                            />
                            <div
                              className="h-9 w-28 rounded-md flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: field.value }}
                            >
                              Preview button
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Address */}
                  <FormField
                    control={clinicForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Clinic address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone + WhatsApp */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={clinicForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91-XXXXX-XXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicForm.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="+91-XXXXX-XXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email */}
                  <FormField
                    control={clinicForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinic Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@clinic.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={clinicForm.control}
                      name="opening_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opening Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clinicForm.control}
                      name="closing_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Working Days */}
                  <FormField
                    control={clinicForm.control}
                    name="working_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Days *</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map((day) => {
                            const checked = field.value.includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() =>
                                  field.onChange(
                                    checked
                                      ? field.value.filter((d) => d !== day)
                                      : [...field.value, day]
                                  )
                                }
                                className={cn(
                                  'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                                  checked
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
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
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" className="gap-2">
                  Next: Admin Account
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={adminForm.control}
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

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={adminForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (login) *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="admin@clinic.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={adminForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91-XXXXX-XXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Password */}
                  <FormField
                    control={adminForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password *</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={handleGeneratePassword}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Generate
                          </Button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min 8 chars, 1 uppercase, 1 number"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        {watchedPassword && (
                          <div className="space-y-1">
                            <div className="flex gap-1 h-1.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'flex-1 rounded-full transition-colors',
                                    i <= strength.score ? strength.color : 'bg-muted'
                                  )}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{strength.label}</p>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={adminForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
                        <FormControl>
                          <Input type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="gap-2">
                  Review & Confirm
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && clinicData && adminData && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-wide">Review & Create</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clinic Details
                  </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{clinicData.name}</span>
                    <span className="text-muted-foreground">Slug</span>
                    <span className="font-mono text-xs">{clinicData.slug}</span>
                    <span className="text-muted-foreground">Color</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-6 rounded border"
                          style={{ backgroundColor: clinicData.primary_color }}
                        />
                        <span className="font-mono text-xs">{clinicData.primary_color}</span>
                      </div>
                      <span className="text-muted-foreground">Hours</span>
                      <span>{hoursSummary}</span>
                      {clinicData.phone && (
                        <>
                          <span className="text-muted-foreground">Phone</span>
                        <span>{clinicData.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin Account
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{adminData.name}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span>{adminData.email}</span>
                    {adminData.phone && (
                      <>
                        <span className="text-muted-foreground">Phone</span>
                        <span>{adminData.phone}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Password</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                      {'•'.repeat(adminData.password.length)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>
                    The admin password will only be shown once after creation. Make sure to copy and
                    share it securely.
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleFinalSubmit} disabled={phase !== 'idle'} className="gap-2">
                <Building2 className="h-4 w-4" />
                Create Clinic
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Success modal ── */}
      <Dialog open={phase === 'success' && !!createdClinic} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-600">🎉 Clinic Created!</DialogTitle>
          </DialogHeader>

          {createdClinic && adminData && (
            <div className="space-y-4">
              <p className="text-sm">
                <strong>{createdClinic.name}</strong> is now live on ClinicOS.
              </p>

              {adminResult?.success ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Admin login credentials
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      ⚠ Save these — shown once!
                    </p>
                  </div>

                  <div className="space-y-2 p-3 bg-muted rounded-lg text-sm font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-right">{adminData.email}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Password</span>
                      <span className="text-right text-red-600 font-bold">{adminData.password}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2 text-sm rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-800">⚠ Admin account setup failed</p>
                  <p className="text-amber-800">
                    Error: {adminResult?.message || 'Failed to create admin account'}
                  </p>
                  <p className="text-amber-700">Create admin manually from Supabase dashboard.</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {adminResult?.success && (
                  <Button onClick={copyCredentials} variant="outline" className="gap-2 w-full">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Credentials'}
                  </Button>
                )}
                <Button className="w-full" onClick={() => navigate(`/super-admin/clinics/${createdClinic.id}`)}>
                  View Clinic →
                </Button>
                <Button variant="ghost" className="w-full" onClick={resetWizard}>
                  Create Another
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
