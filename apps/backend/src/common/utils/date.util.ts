import { DateTime } from 'luxon'

/**
 * Зона, в которой считается «сегодня» на сервере. Раньше бралась системная
 * зона хоста: на UTC-сервере с 00:00 до 03:00 по Москве «сегодня» было ещё
 * вчера — дата абонемента, платежа и продления уезжала на день назад.
 * Переопределяется через APP_TZ (IANA, напр. Asia/Yekaterinburg).
 */
export const DEFAULT_APP_TZ = 'Europe/Moscow'

export function appTimeZone(): string {
  const zone = process.env.APP_TZ?.trim()
  return zone && DateTime.now().setZone(zone).isValid ? zone : DEFAULT_APP_TZ
}

/** Date helpers built on Luxon. */
export const DateUtil = {
  now(): Date {
    return new Date()
  },

  /** Today as ISO date string (YYYY-MM-DD) in the app time zone. */
  todayIso(): string {
    return DateTime.now().setZone(appTimeZone()).toISODate() ?? ''
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
