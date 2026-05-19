import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Loader2 } from 'lucide-react'
import { clinicProfileSchema } from '@/lib/settingsSchemas'
import { z } from 'zod'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClinicProfile, useUpdateClinicProfile, useUploadClinicLogo } from '@/hooks/useSettings'
import { ALL_DAYS, businessHoursToLegacyFields, parseBusinessHours } from '@/lib/businessHours'
import type { BusinessHoursMap, DayKey } from '@/types/settings'

type ProfileFormValues = z.infer<typeof clinicProfileSchema>

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
]

const SLOT_OPTIONS = [15, 20, 30, 45, 60]

export function ClinicProfileTab() {
  const { data: clinic, isLoading } = useClinicProfile()
  const updateProfile = useUpdateClinicProfile()
  const uploadLogo = useUploadClinicLogo()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [businessHours, setBusinessHours] = useState<BusinessHoursMap | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(clinicProfileSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      gstin: '',
      default_slot_duration: 30,
      currency: 'INR',
    },
  })

  useEffect(() => {
    if (!clinic) return
    form.reset({
      name: clinic.name,
      address: clinic.address ?? '',
      phone: clinic.phone ?? '',
      email: clinic.email ?? '',
      website: clinic.website ?? '',
      gstin: clinic.gstin ?? '',
      default_slot_duration: clinic.default_slot_duration ?? 30,
      currency: clinic.currency ?? 'INR',
    })
    setLogoPreview(clinic.logo_url)
    setLogoUrl(clinic.logo_url)
    setBusinessHours(
      parseBusinessHours(clinic.business_hours ?? undefined, {
        opening_time: clinic.opening_time,
        closing_time: clinic.closing_time,
        working_days: clinic.working_days,
      })
    )
  }, [clinic, form])

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    const url = await uploadLogo.mutateAsync(file)
    setLogoUrl(url)
    setLogoPreview(url)
  }

  function buildPayload(values: ProfileFormValues, hours: BusinessHoursMap) {
    const legacy = businessHoursToLegacyFields(hours)
    return {
      name: values.name,
      address: values.address || null,
      phone: values.phone || null,
      email: values.email || null,
      website: values.website || null,
      gstin: values.gstin || null,
      default_slot_duration: values.default_slot_duration,
      currency: values.currency,
      business_hours: hours,
      logo_url: logoUrl,
      ...legacy,
    }
  }

  function onSubmit(values: ProfileFormValues) {
    if (!businessHours) return
    updateProfile.mutate(buildPayload(values, businessHours))
  }

  function updateDay(day: DayKey, patch: Partial<BusinessHoursMap[DayKey]>) {
    setBusinessHours((prev) =>
      prev ? { ...prev, [day]: { ...prev[day], ...patch } } : prev
    )
  }

  if (isLoading || !businessHours) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Clinic identity</CardTitle>
            <CardDescription>Basic information shown to patients and staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="h-24 w-24 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Clinic logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {form.watch('name')?.charAt(0) || 'C'}
                    </span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onLogoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={uploadLogo.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadLogo.isPending ? 'Uploading...' : 'Upload logo'}
                </Button>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Clinic name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourclinic.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gstin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN</FormLabel>
                      <FormControl>
                        <Input placeholder="22AAAAA0000A1Z5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduling defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="default_slot_duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default slot duration</FormLabel>
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
                        <SelectItem key={m} value={String(m)}>
                          {m} minutes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business hours</CardTitle>
            <CardDescription>Set open hours for each day of the week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_DAYS.map((day) => (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 py-2 border-b last:border-0"
              >
                <div className="w-24 flex items-center gap-2">
                  <Switch
                    checked={businessHours[day].enabled}
                    onCheckedChange={(enabled) => updateDay(day, { enabled })}
                  />
                  <span className="text-sm font-medium">{day}</span>
                </div>
                <Input
                  type="time"
                  className="w-32"
                  disabled={!businessHours[day].enabled}
                  value={businessHours[day].open}
                  onChange={(e) => updateDay(day, { open: e.target.value })}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="time"
                  className="w-32"
                  disabled={!businessHours[day].enabled}
                  value={businessHours[day].close}
                  onChange={(e) => updateDay(day, { close: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  )
}