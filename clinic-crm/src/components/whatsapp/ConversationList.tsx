import { useState } from 'react'
import { Search, MessageCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ConversationItem } from './ConversationItem'
import type { WhatsAppConversation, ConversationFilter } from '@/types/whatsapp'

interface ConversationListProps {
  conversations: WhatsAppConversation[]
  isLoading: boolean
  activeId: string | null
  filter: ConversationFilter
  onFilterChange: (f: ConversationFilter) => void
  onSelect: (conv: WhatsAppConversation) => void
}

const FILTERS: { label: string; value: ConversationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Bot', value: 'bot_handling' },
  { label: 'Resolved', value: 'resolved' },
]

export function ConversationList({
  conversations,
  isLoading,
  activeId,
  filter,
  onFilterChange,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.patient_name?.toLowerCase().includes(q) ||
      c.patient_phone.includes(q)
    )
  })

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            className="pl-9 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-border/50">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-2.5 bg-muted animate-pulse rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onClick={() => onSelect(conv)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No results found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? 'Try a different search' : 'WhatsApp messages will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
