import { useMemo, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { DoctorBreak } from '@/api/doctors'
import { useAddDoctorBreak, useDeleteDoctorBreak } from '@/hooks/useDoctors'

interface BreakManagerProps {
  doctorId?: string
  breaks: DoctorBreak[]
  arrivalTime: string
  departureTime: string
  onBreaksChange?: (breaks: DoctorBreak[]) => void
  readOnly?: boolean
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function generateTimes(startHour = 6, endHour = 22, step = 15) {
  const times: string[] = []
  for (let h = startHour; h <= endHour; h += 1) {
    for (let m = 0; m < 60; m += step) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      times.push(time)
    }
  }
  return times
}

function findOverlap(start: string, end: string, items: DoctorBreak[]) {
  const startMin = timeToMinutes(start)
  const endMin = timeToMinutes(end)
  return items.find((b) => {
    const bStart = timeToMinutes(b.start_time)
    const bEnd = timeToMinutes(b.end_time)
    return startMin < bEnd && endMin > bStart
  })
}

function createTempId() {
  return `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function BreakManager({
  doctorId,
  breaks,
  arrivalTime,
  departureTime,
  onBreaksChange,
  readOnly,
}: BreakManagerProps) {
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addBreak = useAddDoctorBreak()
  const deleteBreak = useDeleteDoctorBreak()

  const times = useMemo(() => generateTimes(), [])

  function validate() {
    if (!label.trim()) return 'Label is required'
    if (!start || !end) return 'Start and end time are required'
    if (start >= end) return 'Break start must be before end time'
    if (timeToMinutes(start) < timeToMinutes(arrivalTime) || timeToMinutes(end) > timeToMinutes(departureTime)) {
      return `Break must be within working hours (${formatTime(arrivalTime)} - ${formatTime(departureTime)})`
    }
    const overlap = findOverlap(start, end, breaks)
    if (overlap) return `This overlaps with ${overlap.label} (${formatTime(overlap.start_time)} - ${formatTime(overlap.end_time)})`
    return null
  }

  async function handleAdd() {
    if (readOnly) return
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    setError(null)

    if (doctorId) {
      await addBreak.mutateAsync({ doctor_id: doctorId, label: label.trim(), start_time: start, end_time: end })
    } else if (onBreaksChange) {
      onBreaksChange([
        ...breaks,
        {
          id: createTempId(),
          doctor_id: doctorId ?? null,
          label: label.trim(),
          start_time: start,
          end_time: end,
        },
      ])
    }

    setLabel('')
    setStart('')
    setEnd('')
  }

  async function handleDelete(id: string) {
    if (readOnly) return
    if (doctorId) {
      await deleteBreak.mutateAsync(id)
    } else if (onBreaksChange) {
      onBreaksChange(breaks.filter((b) => b.id !== id))
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {breaks.length === 0 && (
          <p className="text-sm text-muted-foreground">No breaks added yet.</p>
        )}
        {breaks.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">{b.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(b.start_time)} - {formatTime(b.end_time)}
              </p>
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${b.label}`}
                onClick={() => handleDelete(b.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Label</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Lunch Break" />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">From</span>
              <Select value={start} onValueChange={(val: any) => setStart(val)}>
                <SelectTrigger aria-label="Break start time">
                  <SelectValue placeholder="Start" />
                </SelectTrigger>
                <SelectContent>
                  {times.map((t) => (
                    <SelectItem key={`start-${t}`} value={t}>
                      {formatTime(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">To</span>
              <Select value={end} onValueChange={(val: any) => setEnd(val)}>
                <SelectTrigger aria-label="Break end time">
                  <SelectValue placeholder="End" />
                </SelectTrigger>
                <SelectContent>
                  {times.map((t) => (
                    <SelectItem key={`end-${t}`} value={t}>
                      {formatTime(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} className={cn('gap-1.5')}
            disabled={addBreak.isPending}
          >
            <Plus className="h-4 w-4" />
            Add Break
          </Button>
        </div>
      )}
    </div>
  )
}
