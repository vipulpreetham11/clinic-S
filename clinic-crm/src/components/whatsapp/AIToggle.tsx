import { useState } from 'react'
import { Bot, BotOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useToggleAI } from '@/hooks/useConversations'
import { toast } from 'sonner'

interface AIToggleProps {
  conversationId: string
  isEnabled: boolean
  aiEnabled: boolean // global AI setting
}

export function AIToggle({ conversationId, isEnabled, aiEnabled }: AIToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingState, setPendingState] = useState<boolean | null>(null)
  const toggleAI = useToggleAI()

  const handleToggle = (checked: boolean) => {
    if (!aiEnabled && checked) {
      toast.warning('AI Takeover is disabled globally', {
        description: 'Enable it in WhatsApp Settings → AI Config first.',
      })
      return
    }
    setPendingState(checked)
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (pendingState === null) return
    try {
      await toggleAI.mutateAsync({ id: conversationId, enabled: pendingState })
      toast.success(pendingState ? 'AI Takeover enabled' : 'AI Takeover disabled')
    } catch {
      toast.error('Failed to toggle AI')
    }
    setConfirmOpen(false)
    setPendingState(null)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {isEnabled ? (
          <Bot className="h-4 w-4 text-violet-500" />
        ) : (
          <BotOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-muted-foreground">AI</span>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          size="sm"
          aria-label="Toggle AI takeover"
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingState ? 'Enable AI Takeover?' : 'Disable AI Takeover?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingState
                ? 'The AI assistant (Priya) will automatically respond to this patient\'s messages. You can disable it anytime.'
                : 'The AI will stop responding. You\'ll need to reply manually to this patient.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmOpen(false); setPendingState(null) }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={toggleAI.isPending}
              className={pendingState ? 'bg-violet-600 hover:bg-violet-700' : ''}
            >
              {pendingState ? 'Enable AI' : 'Disable AI'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
