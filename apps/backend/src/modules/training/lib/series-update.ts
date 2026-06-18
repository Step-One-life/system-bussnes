export interface SeriesUpdatableFields {
  time?: string
  locationId?: string | null
  note?: string
  isOnline?: boolean
}

export interface SeriesUpdateInput {
  time?: string
  locationId?: string | null
  note?: string
  isOnline?: boolean
  /** Перенос всей серии на N дней (может быть отрицательным). Каждое занятие
   * сдвигается на эту дельту — так двигается серия на другой день недели. */
  dateShiftDays?: number
  // Отклоняются с 400 (см. seriesForbiddenFields):
  date?: string
  groupId?: string
  // Принимается, но игнорируется: пересчитывается по дате каждого занятия.
  isPrime?: boolean
}

/**
 * Поля, распространяемые на ВСЮ серию. Абсолютная дата сюда не входит — перенос
 * серии задаётся относительным `dateShiftDays` (см. seriesTargets). Прайм не
 * копируется: он пересчитывается по дате каждого занятия в `updateSeriesForUser`.
 * Группа/состав учеников не редактируются.
 */
export function seriesUpdateFields(dto: SeriesUpdateInput): SeriesUpdatableFields {
  const out: SeriesUpdatableFields = {}
  if (dto.time !== undefined) out.time = dto.time
  if (dto.locationId !== undefined) out.locationId = dto.locationId
  if (dto.note !== undefined) out.note = dto.note
  if (dto.isOnline !== undefined) out.isOnline = dto.isOnline
  return out
}

/**
 * Поля dto, которые серия не редактирует напрямую: абсолютная дата (перенос —
 * через относительный dateShiftDays) и смена группы (меняет биллинг и состав).
 * Молча игнорировать их нельзя — клиент получил бы «успех» без эффекта, поэтому
 * сервис отвечает 400.
 */
export function seriesForbiddenFields(dto: SeriesUpdateInput): string[] {
  const out: string[] = []
  if (dto.groupId !== undefined) out.push('groupId')
  if (dto.date !== undefined) out.push('date')
  return out
}

/** Сдвиг даты YYYY-MM-DD на N дней (UTC-арифметика, без часовых поясов). */
export function shiftDateISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export interface SeriesTarget<T> {
  occ: T
  date: string
  time: string
  /** Дата ИЛИ время реально изменились — занятию нужна проверка наслоения. */
  moved: boolean
}

/**
 * Целевые дата/время каждого занятия серии после правки. Время — общее новое
 * (клиент шлёт его всегда; если не меняется — остаётся прежним). Дата сдвигается
 * на `shiftDays` (перенос всей серии на другой день). `moved=true` только если
 * дата или время реально изменились: занятие, остающееся на месте, наложений не
 * добавляет, и проверять его (блокируя сейв давним до-барьерным наложением) не нужно.
 */
export function seriesTargets<T extends { date: string; time: string }>(
  occurrences: T[],
  newTime: string | undefined,
  shiftDays: number,
): SeriesTarget<T>[] {
  return occurrences.map((occ) => {
    const date = shiftDays ? shiftDateISO(occ.date, shiftDays) : occ.date
    const time = newTime ?? occ.time
    return { occ, date, time, moved: date !== occ.date || time !== occ.time }
  })
}
