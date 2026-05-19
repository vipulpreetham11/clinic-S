import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSameDay } from 'date-fns'
import {
  Phone, ExternalLink, CheckCircle, MoreHorizontal, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { AIToggle } from './AIToggle'
import { useMessages } from '@/hooks/useMessages'
import { useSendMessage } from '@/hooks/useSendMessage'
import { useMarkResolved, useResetUnread } from '@/hooks/useConversations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { WhatsAppConversation } from '@/types/whatsapp'
import type { WhatsAppTemplate } from '@/types/whatsapp'
import type { WhatsAppAIConfig } from '@/types/whatsapp'

interface ConversationPanelProps {
  conversation: WhatsAppConversation
  clinicId: string
  userId: string
  templates: WhatsAppTemplate[]
  aiConfig: WhatsAppAIConfig | null
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  bot_handling: 'Bot Active',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  bot_handling: 'bg-violet-50 text-violet-700 border-violet-200',
}

export function ConversationPanel({
  conversation,
  clinicId,
  userId,
  templates,
  aiConfig,
}: ConversationPanelProps) {
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: messages = [], isLoading } = useMessages(conversation.id)
  const sendMessage = useSendMessage()
  const markResolved = useMarkResolved()
  const resetUnread = useResetUnread()

  // Reset unread count when panel opens
  useEffect(() => {
    if (conversation.unread_count > 0) {
      resetUnread.mutate(conversation.id)
    }
  }, [conversation.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (content: string) => {
    sendMessage.mutate({
      conversation_id: conversation.id,
      content,
      clinic_id: clinicId,
      sender: 'clinic',
    })
  }

  const handleMarkResolved = async () => {
    try {
      await markResolved.mutateAsync(conversation.id)
      toast.success('Conversation marked as resolved')
    } catch {
      toast.error('Failed to mark as resolved')
    }
  }

  const formattedPhone = conversation.patient_phone.startsWith('+91')
    ? conversation.patient_phone.replace('+91', '').replace(/(\d{5})(\d{5})/, '$1 $2')
    : conversation.patient_phone

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base truncate">
                {conversation.patient_name || formattedPhone}
              </h2>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 flex-shrink-0 ${STATUS_COLORS[conversation.status]}`}
              >
                {STATUS_LABELS[conversation.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formattedPhone}
              </span>
              {conversation.patient_id && (
                <button
                  onClick={() => navigate(`/patients/${conversation.patient_id}`)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View patient
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* AI Toggle */}
          <AIToggle
            conversationId={conversation.id}
            isEnabled={conversation.ai_takeover_enabled}
            aiEnabled={aiConfig?.ai_enabled ?? false}
          />

          {/* Resolve button */}
          {conversation.status !== 'resolved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkResolved}
              disabled={markResolved.isPending}
              className="h-8 text-xs"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Resolve
            </Button>
          )}

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {conversation.patient_id && (
                <DropdownMenuItem onClick={() => navigate(`/patients/${conversation.patient_id}`)}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Patient Record
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {
                toast.info('Assign feature coming soon')
              }}>
                <UserCheck className="h-4 w-4 mr-2" />
                Assign to Me
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const text = messages
                    .map((m) => `[${m.direction === 'inbound' ? 'Patient' : m.ai_generated ? 'AI' : 'Clinic'}] ${m.content || '(media)'}`)
                    .join('\n')
                  navigator.clipboard.writeText(text)
                  toast.success('Chat exported to clipboard')
                }}
              >
                Export Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-3/5' : 'w-2/5'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1]
              const currDate = new Date(msg.created_at)
              const prevDate = prevMsg ? new Date(prevMsg.created_at) : null
              const showSeparator = !prevDate || !isSameDay(currDate, prevDate)

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  showDateSeparator={showSeparator}
                  separatorDate={showSeparator ? currDate : undefined}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        clinicId={clinicId}
        onSend={handleSend}
        isSending={sendMessage.isPending}
        templates={templates}
      />
    </div>
  )
}
