import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface TimeRangePickerProps {
  arrivalTime: string
  departureTime: string
  onArrivalChange: (time: string) => void
  onDepartureChange: (time: string) => void
  disabled?: boolean
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function generateTimes(startHour = 6, endHour = 22, step = 30) {
  const times: string[] = []
  for (let h = startHour; h <= endHour; h += 1) {
    for (let m = 0; m < 60; m += step) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      times.push(time)
    }
  }
  return times
}

export function TimeRangePicker({
  arrivalTime,
  departureTime,
  onArrivalChange,
  onDepartureChange,
  disabled,
}: TimeRangePickerProps) {
  const times = generateTimes()
  const invalid = arrivalTime && departureTime && arrivalTime >= departureTime
  const minutes = Math.max(timeToMinutes(departureTime) - timeToMinutes(arrivalTime), 0)
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Arrives</span>
          <Select value={arrivalTime} onValueChange={(val: any) => onArrivalChange(val)} disabled={disabled}>
            <SelectTrigger aria-label="Select arrival time" className={cn(invalid && 'border-destructive')}>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {times.map((time) => (
                <SelectItem key={`arrival-${time}`} value={time}>
                  {formatTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Leaves</span>
          <Select value={departureTime} onValueChange={(val: any) => onDepartureChange(val)} disabled={disabled}>
            <SelectTrigger aria-label="Select departure time" className={cn(invalid && 'border-destructive')}>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {times.map((time) => (
                <SelectItem key={`departure-${time}`} value={time}>
                  {formatTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">Arrival time must be before departure time.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {hours} hours{remaining ? ` ${remaining} min` : ''} per day
        </p>
      )}
    </div>
  )
}
