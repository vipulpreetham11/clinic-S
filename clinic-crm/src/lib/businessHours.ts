import type { BusinessHoursMap, DayKey } from '@/types/settings'

export const ALL_DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function buildDefaultBusinessHours(
  opening = '09:00',
  closing = '18:00',
  workingDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
): BusinessHoursMap {
  return ALL_DAYS.reduce((acc, day) => {
    acc[day] = {
      enabled: workingDays.includes(day),
      open: opening,
      close: closing,
    }
    return acc
  }, {} as BusinessHoursMap)
}

export function parseBusinessHours(
  raw: Record<string, { enabled: boolean; open: string; close: string }> | null | undefined,
  clinic: { opening_time: string; closing_time: string; working_days: string[] }
): BusinessHoursMap {
  const defaults = buildDefaultBusinessHours(
    clinic.opening_time,
    clinic.closing_time,
    clinic.working_days
  )
  if (raw && Object.keys(raw).length > 0) {
    return { ...defaults, ...raw } as BusinessHoursMap
  }
  return defaults
}

export function businessHoursToLegacyFields(hours: BusinessHoursMap) {
  const working_days = ALL_DAYS.filter((d) => hours[d]?.enabled)
  const enabledDays: DayKey[] = working_days.length > 0 ? (working_days as DayKey[]) : ['Mon']
  const first = hours[enabledDays[0]]
  return {
    working_days,
    opening_time: first?.open ?? '09:00',
    closing_time: first?.close ?? '18:00',
  }
}
