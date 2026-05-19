import { format, isToday, isYesterday } from 'date-fns'
import { Bot, Check, CheckCheck, Image, FileText, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WhatsAppMessage } from '@/types/whatsapp'

interface MessageBubbleProps {
  message: WhatsAppMessage
  showDateSeparator?: boolean
  separatorDate?: Date
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
  if (status === 'failed') return <span className="text-[10px] text-destructive font-medium">Failed</span>
  return <Check className="h-3.5 w-3.5 text-muted-foreground" />
}

function DateSeparator({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Today'
  else if (isYesterday(date)) label = 'Yesterday'
  else label = format(date, 'd MMMM yyyy')

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function MediaContent({ message }: { message: WhatsAppMessage }) {
  if (message.message_type === 'image') {
    return (
      <div className="flex items-center gap-2 text-sm mt-1">
        <Image className="h-4 w-4" />
        <span className="italic text-muted-foreground">Image</span>
      </div>
    )
  }
  if (message.message_type === 'document') {
    return (
      <div className="flex items-center gap-2 text-sm mt-1">
        <FileText className="h-4 w-4" />
        <span className="italic text-muted-foreground">Document</span>
      </div>
    )
  }
  if (message.message_type === 'audio') {
    return (
      <div className="flex items-center gap-2 text-sm mt-1">
        <Volume2 className="h-4 w-4" />
        <span className="italic text-muted-foreground">Voice message</span>
      </div>
    )
  }
  return null
}

export function MessageBubble({ message, showDateSeparator, separatorDate }: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound'
  const isAI = message.ai_generated

  return (
    <>
      {showDateSeparator && separatorDate && (
        <DateSeparator date={separatorDate} />
      )}

      <div className={cn(
        'flex mb-2',
        isInbound ? 'justify-start' : 'justify-end'
      )}>
        <div className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          isInbound
            ? 'bg-muted text-foreground rounded-tl-sm'
            : isAI
              ? 'bg-violet-600 text-white rounded-tr-sm border-2 border-violet-400/40'
              : 'bg-emerald-600 text-white rounded-tr-sm'
        )}>
          {/* AI indicator */}
          {isAI && !isInbound && (
            <div className="flex items-center gap-1 text-violet-200 text-[10px] font-medium mb-1">
              <Bot className="h-3 w-3" />
              <span>AI · Priya</span>
            </div>
          )}

          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}

          {/* Media content */}
          <MediaContent message={message} />

          {/* Time + status */}
          <div className={cn(
            'flex items-center gap-1 mt-1',
            isInbound ? 'justify-start' : 'justify-end'
          )}>
            <span className={cn(
              'text-[10px]',
              isInbound ? 'text-muted-foreground' : 'text-white/70'
            )}>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {!isInbound && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </>
  )
}
