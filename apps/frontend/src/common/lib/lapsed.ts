import { daysBetweenISO } from 'common/utils/date'
import { getLastVisitDate } from 'entities/students/model/students.repo'

import type { Student } from 'entities/students/model/types'

export interface LapsedEntry {
  student: Student
  /** Дней с последнего визита (или с даты записи, если не был ни разу). */
  daysSince: number
  /** Записан, но ещё ни разу не приходил. */
  neverVisited: boolean
}

export const LAPSED_THRESHOLD_DAYS = 14

/**
 * Радар оттока: ученики, которые числятся в группах, но не появлялись
 * ≥ threshold дней. Точка отсчёта — последний визит, для так и не пришедших —
 * дата записи (новичкам даётся та же фора). Дольше всех молчит — первым.
 */
export function computeLapsed(
  students: Student[],
  todayIso: string,
  thresholdDays = LAPSED_THRESHOLD_DAYS,
): LapsedEntry[] {
  const entries: LapsedEntry[] = []
  for (const s of students) {
    if (!s.groups.length) continue
    const lastVisit = getLastVisitDate(s)
    const since = lastVisit ?? s.createdAt?.slice(0, 10)
    if (!since) continue
    const daysSince = daysBetweenISO(since, todayIso)
    if (daysSince < thresholdDays) continue
    entries.push({ student: s, daysSince, neverVisited: !lastVisit })
  }
  return entries.sort((a, b) => b.daysSince - a.daysSince)
}
