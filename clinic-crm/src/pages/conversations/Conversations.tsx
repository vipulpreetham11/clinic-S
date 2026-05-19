import { useState, useEffect } from 'react'
import { MessageCircle, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConversationList } from '@/components/whatsapp/ConversationList'
import { ConversationPanel } from '@/components/whatsapp/ConversationPanel'
import { useAuthContext } from '@/context/AuthContext'
import { useConversations } from '@/hooks/useConversations'
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings'
import { useTemplates } from '@/hooks/useTemplates'
import { useWhatsAppRealtime } from '@/hooks/useWhatsAppRealtime'
import type { WhatsAppConversation, ConversationFilter } from '@/types/whatsapp'

export default function Conversations() {
  const { clinic, user } = useAuthContext()
  const navigate = useNavigate()
  const [activeConversation, setActiveConversation] = useState<WhatsAppConversation | null>(null)
  const [filter, setFilter] = useState<ConversationFilter>('all')
  const [mobileShowPanel, setMobileShowPanel] = useState(false)

  const { data: conversations = [], isLoading } = useConversations(clinic?.id, filter)
  const { data: aiConfig } = useWhatsAppSettings(clinic?.id)
  const { data: templates = [] } = useTemplates(clinic?.id)

  // Enable realtime subscription
  useWhatsAppRealtime(clinic?.id)

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      setActiveConversation(conversations[0])
    }
  }, [conversations])

  // Update active conversation when list updates (e.g. new message)
  useEffect(() => {
    if (activeConversation) {
      const updated = conversations.find((c) => c.id === activeConversation.id)
      if (updated) setActiveConversation(updated)
    }
  }, [conversations])

  const handleSelectConversation = (conv: WhatsAppConversation) => {
    setActiveConversation(conv)
    setMobileShowPanel(true)
  }

  if (!clinic || !user) return null

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          {mobileShowPanel && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 mr-1"
              onClick={() => setMobileShowPanel(false)}
            >
              ←
            </Button>
          )}
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <h1 className="font-semibold text-base">WhatsApp</h1>
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {conversations.filter((c) => c.unread_count > 0).length} unread
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/whatsapp/settings')}
          className="h-8 text-xs"
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Settings
        </Button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list - hidden on mobile when panel is open */}
        <div className={`
          flex-shrink-0 w-full md:w-80 lg:w-96
          ${mobileShowPanel ? 'hidden md:flex' : 'flex'}
          flex-col
        `}>
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeId={activeConversation?.id || null}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Conversation panel */}
        <div className={`
          flex-1 overflow-hidden
          ${mobileShowPanel ? 'flex' : 'hidden md:flex'}
          flex-col
        `}>
          {activeConversation ? (
            <ConversationPanel
              conversation={activeConversation}
              clinicId={clinic.id}
              userId={user.id}
              templates={templates}
              aiConfig={aiConfig || null}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg">WhatsApp Inbox</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                {conversations.length > 0
                  ? 'Select a conversation to start chatting'
                  : 'Connect WhatsApp to start receiving patient messages'
                }
              </p>
              {conversations.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate('/whatsapp/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure WhatsApp
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
