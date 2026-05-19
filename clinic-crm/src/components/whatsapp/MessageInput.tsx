import { useState, useRef, type KeyboardEvent } from 'react'
import { Send, LayoutTemplate, Smile, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TemplatePickerModal } from './TemplatePickerModal'
import type { WhatsAppTemplate } from '@/types/whatsapp'

interface MessageInputProps {
  clinicId: string
  onSend: (content: string) => void
  isSending: boolean
  templates: WhatsAppTemplate[]
}

export function MessageInput({ clinicId, onSend, isSending, templates }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = message.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setMessage('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setMessage((prev) => (prev ? prev + '\n' + template.content : template.content))
    setTemplateModalOpen(false)
    textareaRef.current?.focus()
  }

  return (
    <>
      <div className="border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title="Templates"
              onClick={() => setTemplateModalOpen(true)}
            >
              <LayoutTemplate className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title="Emoji"
              onClick={() => {/* Emoji picker integration stub */}}
            >
              <Smile className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title="Attach (Coming soon)"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none min-h-[40px] max-h-[120px] text-sm py-2 rounded-xl"
            rows={1}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              // Auto-grow
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={handleKeyDown}
          />

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-[84px]">
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      <TemplatePickerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        templates={templates}
        onSelect={handleTemplateSelect}
      />
    </>
  )
}
