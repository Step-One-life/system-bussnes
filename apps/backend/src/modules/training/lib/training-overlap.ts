/**
 * Чистая логика пересечения тренировок по времени в пределах одного дня.
 * Используется как серверный барьер против наслоения занятий (один тренер
 * физически не может вести два занятия одновременно).
 */

export interface OverlapCandidate {
  date: string
  time: string
  durationMinutes: number
}

export interface ExistingTraining {
  id: string
  date: string
  time: string
  sessionDuration: number
}

/** "HH:MM" → минуты от начала суток. Невалидные части → 0. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Возвращает занятия из `existing`, пересекающиеся по времени с `candidate`
 * в тот же день. Занятия без времени (`''`) не участвуют. `excludeIds`
 * исключаются (например, сами занятия редактируемой серии).
 */
export function findOverlaps(
  candidate: OverlapCandidate,
  existing: ExistingTraining[],
  excludeIds: string[] = [],
): ExistingTraining[] {
  if (!candidate.time) return []
  const start = toMinutes(candidate.time)
  const end = start + candidate.durationMinutes
  return existing.filter((t) => {
    if (t.date !== candidate.date || !t.time || excludeIds.includes(t.id)) return false
    const s = toMinutes(t.time)
    const e = s + (t.sessionDuration || 60)
    return start < e && s < end
  })
}
