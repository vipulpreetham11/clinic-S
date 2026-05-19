import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WhatsAppTemplate, TemplateCategory } from '@/types/whatsapp'

interface TemplatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  templates: WhatsAppTemplate[]
  onSelect: (template: WhatsAppTemplate) => void
}

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  appointment: 'bg-blue-50 text-blue-700 border-blue-200',
  reminder: 'bg-amber-50 text-amber-700 border-amber-200',
  followup: 'bg-green-50 text-green-700 border-green-200',
  general: 'bg-gray-50 text-gray-700 border-gray-200',
}

export function TemplatePickerModal({ isOpen, onClose, templates, onSelect }: TemplatePickerModalProps) {
  const [search, setSearch] = useState('')

  const filtered = templates.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
  })

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Message Template</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-3 -mx-4 px-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No templates found</p>
          ) : (
            filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-colors',
                  'hover:bg-muted/60 hover:border-primary/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-medium text-sm">{template.name}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5', CATEGORY_COLORS[template.category])}
                  >
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {template.content}
                </p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
