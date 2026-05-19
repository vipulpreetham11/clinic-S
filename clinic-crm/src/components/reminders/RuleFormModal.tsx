import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import type { ReminderRule, ReminderTriggerType, ReminderChannel } from '../../types/reminder'
import { useUpsertRule } from '../../hooks/useReminders'
import { toast } from 'sonner'

interface RuleFormModalProps {
  isOpen: boolean
  onClose: () => void
  clinicId: string
  initialData?: ReminderRule | null
}

export function RuleFormModal({ isOpen, onClose, clinicId, initialData }: RuleFormModalProps) {
  const upsertMutation = useUpsertRule()

  const { register, handleSubmit, control, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      trigger_type: 'appointment_upcoming' as ReminderTriggerType,
      offset_hours: -24,
      channel: ['whatsapp'] as ReminderChannel[],
      message_template: '',
      is_active: true
    }
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          trigger_type: initialData.trigger_type,
          offset_hours: initialData.offset_hours,
          channel: initialData.channel,
          message_template: initialData.message_template,
          is_active: initialData.is_active
        })
      } else {
        reset({
          name: '',
          trigger_type: 'appointment_upcoming',
          offset_hours: -24,
          channel: ['whatsapp'],
          message_template: 'Hi {{patient_name}}, a reminder for your appointment on {{date}} at {{time}}.',
          is_active: true
        })
      }
    }
  }, [isOpen, initialData, reset])

  const onSubmit = (data: any) => {
    if (!data.name.trim() || !data.message_template.trim() || data.channel.length === 0) {
      toast.error('Please fill all required fields and select at least one channel')
      return
    }

    upsertMutation.mutate(
      {
        id: initialData?.id,
        clinic_id: clinicId,
        ...data
      },
      {
        onSuccess: () => {
          onClose()
        }
      }
    )
  }

  const selectedChannels = watch('channel')

  const toggleChannel = (ch: ReminderChannel) => {
    if (selectedChannels.includes(ch)) {
      setValue('channel', selectedChannels.filter((c: ReminderChannel) => c !== ch))
    } else {
      setValue('channel', [...selectedChannels, ch])
    }
  }

  const insertVariable = (variable: string) => {
    const currentMsg = watch('message_template')
    setValue('message_template', currentMsg + `{{${variable}}}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Reminder Rule' : 'Add Reminder Rule'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input {...register('name', { required: true })} placeholder="e.g. 24hr Before Appointment" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Controller
                control={control}
                name="trigger_type"
                render={({ field }: any) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appointment_upcoming">Upcoming Appointment</SelectItem>
                      <SelectItem value="appointment_followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Offset (Hours)</Label>
              <Input type="number" {...register('offset_hours', { required: true, valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground">-24 = 24hrs before, 48 = 2 days after</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ch-wa" 
                  checked={selectedChannels.includes('whatsapp')}
                  onCheckedChange={() => toggleChannel('whatsapp')}
                />
                <Label htmlFor="ch-wa" className="font-normal">WhatsApp</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ch-sms" 
                  checked={selectedChannels.includes('sms')}
                  onCheckedChange={() => toggleChannel('sms')}
                />
                <Label htmlFor="ch-sms" className="font-normal">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ch-email" 
                  checked={selectedChannels.includes('email')}
                  onCheckedChange={() => toggleChannel('email')}
                />
                <Label htmlFor="ch-email" className="font-normal">Email</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea 
              {...register('message_template', { required: true })} 
              className="h-24"
              placeholder="Hi {{patient_name}}..."
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-muted-foreground pt-1">Variables:</span>
              {['patient_name', 'doctor', 'date', 'time', 'clinic_name'].map(v => (
                <Badge 
                  key={v} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-gray-200"
                  onClick={() => insertVariable(v)}
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
