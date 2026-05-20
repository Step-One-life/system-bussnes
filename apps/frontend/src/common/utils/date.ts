import 'dayjs/locale/ru'
import dayjs from 'dayjs'

dayjs.locale('ru')

const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

/** "15 мая" */
export function formatDateShort(isoDate?: string | null): string {
  if (!isoDate) return '—'
  return dayjs(isoDate).format('D MMMM')
}

/** "15 мая 2026" */
export function formatDateFull(isoDate?: string | null): string {
  if (!isoDate) return '—'
  return dayjs(isoDate).format('D MMMM YYYY')
}

/** Short month, e.g. "май" */
export function formatMonth(isoDate?: string | null): string {
  if (!isoDate) return ''
  return dayjs(isoDate).format('MMM').replace('.', '')
}

/** Day number */
export function formatDay(isoDate?: string | null): string {
  if (!isoDate) return ''
  return String(dayjs(isoDate).date())
}

/** Short day-of-week, e.g. "Пн" */
export function formatDayOfWeek(isoDate?: string | null): string {
  if (!isoDate) return ''
  return DOW[new Date(isoDate + 'T00:00:00').getDay()]
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
