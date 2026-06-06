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
  // Принимается, но НЕ распространяется на серию:
  date?: string
  groupId?: string
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
