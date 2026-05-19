import React from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { ReminderRule } from '../../types/reminder'
import { useTestRule } from '../../hooks/useReminders'
import { toast } from 'sonner'

interface TestRuleModalProps {
  isOpen: boolean
  onClose: () => void
  clinicId: string
  rule: ReminderRule | null
}

export function TestRuleModal({ isOpen, onClose, clinicId, rule }: TestRuleModalProps) {
  const testMutation = useTestRule()
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      phone: ''
    }
  })

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      reset({ phone: '' })
    }
  }, [isOpen, reset])

  const onSubmit = (data: { phone: string }) => {
    if (!rule) return
    if (!data.phone || data.phone.length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }

    testMutation.mutate(
      { rule, phone: data.phone, clinicId },
      {
        onSuccess: () => {
          onClose()
        }
      }
    )
  }

  if (!rule) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Test Rule: {rule.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Test Phone Number</Label>
            <Input 
              {...register('phone', { required: true })} 
              placeholder="e.g. +919876543210" 
              type="tel"
            />
            <p className="text-xs text-muted-foreground">
              We will send a test message using the configured channel(s) to this number. It will be prefixed with [TEST].
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
            <strong>Preview:</strong><br/>
            {rule.message_template}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={testMutation.isPending}>
              {testMutation.isPending ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
