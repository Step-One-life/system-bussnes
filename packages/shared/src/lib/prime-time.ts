/**
 * Окно прайм-тайма локации. Все поля опциональны: если они не заданы,
 * используются дефолты (будни 17:00–19:59, выходные 10:00–19:59).
 *
 * Формат времени — "HH:MM" (24-часовой).
 */
export interface PrimeWindow {
  primeWeekdayStart?: string | null
  primeWeekdayEnd?: string | null
  primeWeekendStart?: string | null
  primeWeekendEnd?: string | null
}

/** "HH:MM" → минуты от начала суток. Невалидные части → 0. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Прайм-тайм по дате (`YYYY-MM-DD`), времени (`HH:MM`) и опциональному окну
 * локации. Дефолтное окно: будни 17:00–19:59 (1020–1200), выходные
 * 10:00–19:59 (600–1200). Конец окна — эксклюзивно (`mins < end`), как и на
 * фронте до выноса в shared.
 *
 * Если у локации заполнено соответствующее поле — используется оно, иначе
 * берётся дефолт. Это позволяет переопределять, например, только будние
 * границы, оставив выходные стандартными.
 */
export function isPrimeTime(
  date: string,
  time: string,
  location?: PrimeWindow | null,
): boolean {
  if (!date || !time) return false
  const dow = new Date(date + 'T00:00:00').getDay()
  const mins = timeToMinutes(time)
  const isWeekend = dow === 0 || dow === 6

  if (isWeekend) {
    const start = location?.primeWeekendStart ? timeToMinutes(location.primeWeekendStart) : 600
    const end = location?.primeWeekendEnd ? timeToMinutes(location.primeWeekendEnd) : 1200
    return mins >= start && mins < end
  }
  const start = location?.primeWeekdayStart ? timeToMinutes(location.primeWeekdayStart) : 1020
  const end = location?.primeWeekdayEnd ? timeToMinutes(location.primeWeekdayEnd) : 1200
  return mins >= start && mins < end
}
