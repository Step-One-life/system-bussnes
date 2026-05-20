import { DateTime } from 'luxon'

/** Date helpers built on Luxon. */
export const DateUtil = {
  now(): Date {
    return new Date()
  },

  /** Today as ISO date string (YYYY-MM-DD). */
  todayIso(): string {
    return DateTime.now().toISODate() ?? ''
  },

  /** Add days to an ISO date string, return ISO date. */
  addDays(isoDate: string, days: number): string {
    return DateTime.fromISO(isoDate).plus({ days }).toISODate() ?? isoDate
  },

  /** Whole days between two ISO dates (b - a). */
  daysBetween(a: string, b: string): number {
    return Math.round(DateTime.fromISO(b).diff(DateTime.fromISO(a), 'days').days)
  },
}
