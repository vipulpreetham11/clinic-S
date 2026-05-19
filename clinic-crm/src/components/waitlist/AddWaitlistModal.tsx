import React from 'react'
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
import { useAddToWaitlist } from '../../hooks/useWaitlist'
import { useDoctors } from '../../hooks/useDoctors'
import { useServices } from '../../hooks/useServices'
import { toast } from 'sonner'
import { addDays, format } from 'date-fns'

// Note: In a real app we'd use a robust PatientSearch component
// Here we'll simulate it with a simple text input for patient ID for simplicity,
// or assume it's integrated similarly to NewAppointment
interface AddWaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  clinicId: string
}

export function AddWaitlistModal({ isOpen, onClose, clinicId }: AddWaitlistModalProps) {
  const addMutation = useAddToWaitlist()
  const { data: doctors } = useDoctors()
  const { data: services } = useServices()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      patient_id: '',
      doctor_id: 'any',
      service_id: 'any',
      preferred_date: '',
      preferred_time_start: '',
      preferred_time_end: '',
      priority: '0',
      notes: '',
      expires_in: '7'
    }
  })

  React.useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = (data: any) => {
    if (!data.patient_id) {
      toast.error('Patient is required')
      return
    }

    const payload: any = {
      clinic_id: clinicId,
      patient_id: data.patient_id,
      priority: parseInt(data.priority),
      status: 'waiting'
    }

    if (data.doctor_id !== 'any') payload.doctor_id = data.doctor_id
    if (data.service_id !== 'any') payload.service_id = data.service_id
    if (data.preferred_date) payload.preferred_date = data.preferred_date
    if (data.preferred_time_start) payload.preferred_time_start = data.preferred_time_start
    if (data.preferred_time_end) payload.preferred_time_end = data.preferred_time_end
    if (data.notes) payload.notes = data.notes

    if (data.expires_in !== 'never') {
      const days = parseInt(data.expires_in)
      payload.expires_at = format(addDays(new Date(), days), 'yyyy-MM-dd')
    }

    addMutation.mutate(payload, {
      onSuccess: () => onClose()
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Patient ID (required)</Label>
            <Input {...register('patient_id', { required: true })} placeholder="UUID of patient" />
            <p className="text-xs text-muted-foreground">In a full build, this would be the PatientSearch combobox.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred Doctor</Label>
              <Controller
                control={control}
                name="doctor_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Doctor</SelectItem>
                      {doctors?.map((doc: any) => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred Service</Label>
              <Controller
                control={control}
                name="service_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Service</SelectItem>
                      {services?.map((svc: any) => (
                        <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Date</Label>
            <Input type="date" {...register('preferred_date')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time Window (Start)</Label>
              <Input type="time" {...register('preferred_time_start')} />
            </div>
            <div className="space-y-2">
              <Label>Time Window (End)</Label>
              <Input type="time" {...register('preferred_time_end')} />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Priority</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <div className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="r0" 
                      name="priority" 
                      value="0" 
                      checked={field.value === '0'} 
                      onChange={() => field.onChange('0')}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <Label htmlFor="r0" className="font-normal cursor-pointer">Normal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="r1" 
                      name="priority" 
                      value="1" 
                      checked={field.value === '1'} 
                      onChange={() => field.onChange('1')}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <Label htmlFor="r1" className="font-normal text-amber-600 cursor-pointer">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id="r2" 
                      name="priority" 
                      value="2" 
                      checked={field.value === '2'} 
                      onChange={() => field.onChange('2')}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <Label htmlFor="r2" className="font-normal text-red-600 cursor-pointer">Urgent</Label>
                  </div>
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Expires After</Label>
            <Controller
              control={control}
              name="expires_in"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="never">No Expiry</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea {...register('notes')} placeholder="Special requests..." className="h-16" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add to Waitlist'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
