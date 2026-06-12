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
  // Отклоняются с 400 (см. seriesForbiddenFields):
  date?: string
  groupId?: string
  // Принимается, но игнорируется: пересчитывается по дате каждого занятия.
  isPrime?: boolean
}

/**
 * Поля, распространяемые на ВСЮ серию. Дата сюда не входит — у каждого занятия
 * своя дата. Прайм не копируется: он пересчитывается по дате каждого занятия
 * в `updateSeriesForUser`. Группа/состав учеников не редактируются.
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
 * Поля dto, которые серия не редактирует: дата у каждого занятия своя, смена
 * группы меняет биллинг и состав. Молча игнорировать их нельзя — клиент
 * получил бы «успех» без эффекта, поэтому сервис отвечает 400.
 */
export function seriesForbiddenFields(dto: SeriesUpdateInput): string[] {
  const out: string[] = []
  if (dto.groupId !== undefined) out.push('groupId')
  if (dto.date !== undefined) out.push('date')
  return out
}

/**
 * Занятия серии, которым нужна проверка наложений при смене времени: только
 * те, у кого время реально меняется. Клиент шлёт time всегда (в том числе
 * без изменений) — занятие, остающееся на месте, наложений не добавляет,
 * а проверка «как есть» блокировала бы любой сейв серии с давним
 * (до-барьерным) наложением в данных.
 */
export function occurrencesNeedingOverlapCheck<T extends { time: string }>(
  occurrences: T[],
  newTime: string | undefined,
): T[] {
  if (newTime === undefined) return []
  return occurrences.filter((t) => t.time !== newTime)
}
