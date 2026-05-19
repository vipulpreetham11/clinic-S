// Minimal Accordion stub using base-ui/collapsible
import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  className?: string
  children: React.ReactNode
  value?: string
  defaultValue?: string
}

const AccordionContext = React.createContext<{
  value: string | null
  onToggle: (val: string) => void
}>({ value: null, onToggle: () => {} })

function Accordion({ children, className, type = 'single', defaultValue, value: controlledValue }: AccordionProps) {
  const [value, setValue] = React.useState<string | null>(defaultValue || null)
  const current = controlledValue !== undefined ? controlledValue : value
  return (
    <AccordionContext.Provider value={{
      value: current || null,
      onToggle: (val) => setValue((prev) => prev === val ? null : val)
    }}>
      <div className={cn('divide-y divide-border', className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

function AccordionItem({ value, className, children }: AccordionItemProps) {
  return (
    <div data-value={value} className={cn('border-b border-border', className)}>
      {children}
    </div>
  )
}

interface AccordionTriggerProps {
  className?: string
  children: React.ReactNode
}

function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const { value, onToggle } = React.useContext(AccordionContext)
  const item = React.useContext(AccordionItemContext)
  const isOpen = value === item

  return (
    <button
      className={cn(
        'flex w-full items-center justify-between py-4 text-sm font-medium transition-all hover:underline [&[data-open]>svg]:rotate-180',
        className
      )}
      onClick={() => onToggle(item)}
      data-open={isOpen ? '' : undefined}
    >
      {children}
      <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
    </button>
  )
}

interface AccordionContentProps {
  className?: string
  children: React.ReactNode
}

function AccordionContent({ className, children }: AccordionContentProps) {
  const { value } = React.useContext(AccordionContext)
  const item = React.useContext(AccordionItemContext)
  const isOpen = value === item

  if (!isOpen) return null

  return (
    <div className={cn('overflow-hidden text-sm pb-4', className)}>
      {children}
    </div>
  )
}

// Helper context to pass item value down
const AccordionItemContext = React.createContext<string>('')

// Wrap AccordionItem to provide context
const OriginalAccordionItem = AccordionItem
function AccordionItemWithContext({ value, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <OriginalAccordionItem value={value} {...props} />
    </AccordionItemContext.Provider>
  )
}

export { Accordion, AccordionItemWithContext as AccordionItem, AccordionTrigger, AccordionContent }
