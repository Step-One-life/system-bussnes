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

export interface ScheduleGroupInfo {
  id: string
  name: string
  duration: number
  isIndividual: boolean
  schedule: { day: string; time: string }[]
}

/** День недели даты в формате расписаний групп ('Пн'…'Вс'). */
const DAY_ABBRS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
function dayAbbrOf(date: string): string {
  return DAY_ABBRS[new Date(date + 'T00:00:00').getDay()]
}

/**
 * Слоты расписаний групп на дату как кандидаты пересечения для `findOverlaps`
 * («Запланировано» в календаре — тоже занятие). Слот группы участвует, только
 * если у группы нет записанной тренировки на эту дату (иначе реальная запись
 * уже в проверке — слот в календаре подавляется ею). Группа самого кандидата
 * исключается: отметка её же слота создаёт тренировку ровно в это время.
 * Индивидуальные группы пропускаются — их план хранится реальными записями.
 */
export function scheduleSlotsForDate(
  date: string,
  groups: ScheduleGroupInfo[],
  groupIdsWithTraining: string[],
  excludeGroupId?: string | null,
): ExistingTraining[] {
  const day = dayAbbrOf(date)
  const recorded = new Set(groupIdsWithTraining)
  const out: ExistingTraining[] = []
  for (const g of groups) {
    if (g.isIndividual || g.id === excludeGroupId || recorded.has(g.id)) continue
    for (const slot of g.schedule ?? []) {
      if (slot.day !== day || !slot.time) continue
      out.push({
        id: `sched:${g.id}:${slot.time}`,
        date,
        time: slot.time,
        sessionDuration: g.duration || 60,
      })
    }
  }
  return out
}
