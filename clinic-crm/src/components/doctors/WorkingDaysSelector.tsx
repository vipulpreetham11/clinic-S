import { cn } from '@/lib/utils'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface WorkingDaysSelectorProps {
  value: string[]
  onChange: (days: string[]) => void
  disabled?: boolean
}

export function WorkingDaysSelector({ value, onChange, disabled }: WorkingDaysSelectorProps) {
  function toggleDay(day: string) {
    if (disabled) return
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day))
    } else {
      onChange([...value, day])
    }
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day) => {
        const active = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            aria-pressed={active}
            aria-label={`Toggle ${day}`}
            disabled={disabled}
            className={cn(
              'h-9 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {day}
          </button>
        )
      })}
    </div>
  )
}
