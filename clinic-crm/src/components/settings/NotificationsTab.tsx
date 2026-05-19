import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationSettings, useSaveNotificationSettings } from '@/hooks/useSettings'
import type { ClinicNotificationSettings } from '@/types/settings'
import { Loader2 } from 'lucide-react'

const TOGGLES: {
  key: keyof ClinicNotificationSettings
  label: string
  description: string
}[] = [
  {
    key: 'new_appointment_notify_receptionist',
    label: 'New appointment',
    description: 'Notify receptionist when a new appointment is booked (in-app)',
  },
  {
    key: 'appointment_cancelled_notify_doctor',
    label: 'Appointment cancelled',
    description: 'Notify the assigned doctor when an appointment is cancelled (in-app)',
  },
  {
    key: 'reminder_failures_notify_admin',
    label: 'Reminder failures',
    description: 'Notify clinic admin when automated reminders fail (in-app)',
  },
  {
    key: 'whatsapp_delivery_failures_notify_admin',
    label: 'WhatsApp delivery failures',
    description: 'Notify clinic admin when WhatsApp messages fail to deliver',
  },
]

export function NotificationsTab() {
  const { data, isLoading } = useNotificationSettings()
  const save = useSaveNotificationSettings()

  const form = useForm<ClinicNotificationSettings>({
    defaultValues: data,
  })

  useEffect(() => {
    if (data) form.reset(data)
  }, [data, form])

  function onSubmit(values: ClinicNotificationSettings) {
    save.mutate(values)
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>In-app notifications</CardTitle>
          <CardDescription>
            Control which events trigger notifications for your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {TOGGLES.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-4 py-2 border-b last:border-0"
            >
              <div className="space-y-1">
                <Label htmlFor={item.key} className="text-sm font-medium">
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={form.watch(item.key)}
                onCheckedChange={(checked) => form.setValue(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end mt-4">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save notification settings'
          )}
        </Button>
      </div>
    </form>
  )
}
