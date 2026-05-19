import { formatDistanceToNow } from 'date-fns'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { WhatsAppConversation } from '@/types/whatsapp'

interface ConversationItemProps {
  conversation: WhatsAppConversation
  isActive: boolean
  onClick: () => void
}

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }
  return phone.slice(-2)
}

function getAvatarColor(id: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-violet-100 text-violet-700',
    'bg-cyan-100 text-cyan-700',
  ]
  const idx = id.charCodeAt(0) % colors.length
  return colors[idx]
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const displayName = conversation.patient_name || conversation.patient_phone

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50',
        'hover:bg-muted/60',
        isActive && 'bg-primary/10 border-l-2 border-l-primary'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
        getAvatarColor(conversation.id)
      )}>
        {getInitials(conversation.patient_name, conversation.patient_phone)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn(
            'text-sm font-medium truncate',
            conversation.unread_count > 0 && 'font-semibold'
          )}>
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {conversation.last_message_at
              ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })
              : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={cn(
            'text-xs text-muted-foreground truncate',
            conversation.unread_count > 0 && 'text-foreground font-medium'
          )}>
            {conversation.last_message_preview || 'No messages yet'}
          </p>

          <div className="flex items-center gap-1 flex-shrink-0">
            {conversation.ai_takeover_enabled && (
              <span title="AI active">
                <Bot className="h-3.5 w-3.5 text-violet-500" />
              </span>
            )}
            {conversation.unread_count > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        {conversation.status !== 'open' && (
          <div className="mt-1">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1 py-0 h-4',
                conversation.status === 'resolved' && 'bg-green-50 text-green-700 border-green-200',
                conversation.status === 'bot_handling' && 'bg-violet-50 text-violet-700 border-violet-200'
              )}
            >
              {conversation.status === 'bot_handling' ? 'Bot Active' : 'Resolved'}
            </Badge>
          </div>
        )}
      </div>
    </button>
  )
}
