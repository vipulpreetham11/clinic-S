import { isBefore, isToday, parse, format, parseISO } from 'date-fns'

interface DoctorConfig {
  arrival_time: string
  departure_time: string
  slot_duration: number
  working_days: string[]
}

interface TimeRange {
  start_time: string
  end_time: string
}

interface BlockedDate {
  date: string
}

interface SlotGeneratorOptions {
  doctor: DoctorConfig
  breaks: TimeRange[]
  existingAppointments: TimeRange[]
  blockedDates: BlockedDate[]
  date: string // YYYY-MM-DD
}

/**
 * Parses a time string like "09:00" into total minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Converts total minutes since midnight back to "HH:MM" string.
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * Checks if a slot overlaps with any period in the given array of time ranges.
 */
function isOverlapping(slotStart: number, slotEnd: number, ranges: TimeRange[]): boolean {
  return ranges.some((range) => {
    const rangeStart = timeToMinutes(range.start_time)
    const rangeEnd = timeToMinutes(range.end_time)
    // Overlap condition: start is before end of range, AND end is after start of range
    return slotStart < rangeEnd && slotEnd > rangeStart
  })
}

/**
 * Generates available time slots for a doctor on a specific date.
 * 
 * Returns an array of start time strings (e.g., ["09:00", "09:30", "10:00"])
 */
export function generateAvailableSlots({
  doctor,
  breaks,
  existingAppointments,
  blockedDates,
  date,
}: SlotGeneratorOptions): string[] {
  const { arrival_time, departure_time, slot_duration, working_days } = doctor
  
  // 1. Check if date is a working day
  const targetDate = parseISO(date)
  const dayName = format(targetDate, 'EEE') // 'Mon', 'Tue', etc.
  if (!working_days.includes(dayName)) {
    return [] // Not a working day
  }

  // 2. Check if date is blocked
  if (blockedDates.some(b => b.date === date)) {
    return [] // Date is blocked
  }

  const startMin = timeToMinutes(arrival_time)
  const endMin = timeToMinutes(departure_time)
  const availableSlots: string[] = []

  const isCurrentDay = isToday(targetDate)
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  // 3. Generate slots
  for (let current = startMin; current + slot_duration <= endMin; current += slot_duration) {
    const slotEnd = current + slot_duration
    const slotStartStr = minutesToTime(current)

    // Remove slots in the past (if today)
    if (isCurrentDay && current <= currentMinutes) {
      continue
    }

    // Check overlaps with breaks and appointments
    const inBreak = isOverlapping(current, slotEnd, breaks)
    const booked = isOverlapping(current, slotEnd, existingAppointments)

    if (!inBreak && !booked) {
      availableSlots.push(slotStartStr)
    }
  }

  return availableSlots
}
