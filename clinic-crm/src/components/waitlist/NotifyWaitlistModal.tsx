import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { useAuthContext } from '../../context/AuthContext'
import type { WaitlistEntry } from '../../types/waitlist'
import { useNotifyWaitlistEntry } from '../../hooks/useWaitlist'
import { Copy, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface NotifyWaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  entry: WaitlistEntry | null
}

export function NotifyWaitlistModal({ isOpen, onClose, entry }: NotifyWaitlistModalProps) {
  const { clinic } = useAuthContext()
  const notifyMutation = useNotifyWaitlistEntry()
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isOpen && entry) {
      const pName = entry.patients?.name || 'there'
      const cName = clinic?.name || 'our clinic'
      const doc = entry.doctors?.name ? `with ${entry.doctors.name} ` : ''
      const prefDate = entry.preferred_date ? `on ${format(new Date(entry.preferred_date), 'dd MMM')} ` : ''
      
      setMessage(`Hi ${pName}, a slot has opened up ${doc}${prefDate}at ${cName}. Reply YES to confirm or call us at [number].`)
    }
  }, [isOpen, entry, clinic])

  const handleNotify = (channel: string) => {
    if (!entry) return
    
    notifyMutation.mutate({ id: entry.id, message, channel }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard')
    // We also mark as notified manually if they just copied it
    if (entry) {
       notifyMutation.mutate({ id: entry.id, message, channel: 'manual' }, {
         onSuccess: () => {
           onClose()
         }
       })
    }
  }

  if (!entry) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Notify Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-muted-foreground">Patient</Label>
            <div className="font-medium text-lg">{entry.patients?.name}</div>
            <div className="text-sm">{entry.patients?.phone}</div>
          </div>

          <div className="space-y-2">
            <Label>Suggested Message</Label>
            <Textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              className="h-24"
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button 
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" 
              onClick={() => handleNotify('whatsapp')}
              disabled={notifyMutation.isPending}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send via WhatsApp
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleCopy}
              disabled={notifyMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard & Mark Notified
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
