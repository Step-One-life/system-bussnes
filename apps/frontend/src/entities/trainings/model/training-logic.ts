import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

import { minutesToTime, timeToMinutes } from 'common/utils/date'
import { getGroups } from 'entities/groups/model/groups.repo'
import { getStudentById } from 'entities/students/model/students.repo'

import { addAttendees, getTrainings } from './trainings.repo'

import type { Training, TrainingConflict } from './types'
import type { Group } from 'entities/groups/model/types'
import type { DeductStatus, Subscription } from 'entities/students/model/types'

/**
 * Prime-time check.
 * Weekdays 17:00–19:59, weekends 10:00–19:59.
 */
export function isPrimeTime(date: string, time: string): boolean {
  if (!date || !time) return false
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const [h, m] = time.split(':').map(Number)
  const mins = h * 60 + (m || 0)
  const isWeekend = dow === 0 || dow === 6
  return isWeekend ? mins >= 600 && mins <= 1199 : mins >= 1020 && mins <= 1199
}

/** Trainings that overlap with a proposed slot. */
export async function checkTrainingConflict(
  date: string,
  time: string,
  groupId: string,
  excludeId: string | null = null,
  sessionDuration?: number,
): Promise<TrainingConflict[]> {
  if (!time) return []

  const [allTrainings, allGroups] = await Promise.all([getTrainings(), getGroups()])

  const groupMap: Record<string, Group> = Object.fromEntries(map(allGroups, (g) => [g.name, g]))
  // Для новой тренировки приоритет у явно переданной длительности (например,
  // индивидуальная сессия 90 мин), затем длительность группы, затем 60.
  const newDur = sessionDuration ?? groupMap[groupId]?.duration ?? 60
  const newStart = timeToMinutes(time)
  const newEnd = newStart + newDur

  // У существующих тренировок длительность может отличаться от группы
  // (индивидуальные 1.5ч сохраняют sessionDuration в самой записи).
  const durationOf = (t: Training): number =>
    t.sessionDuration ?? groupMap[t.groupId]?.duration ?? 60

  const overlapping = filter(allTrainings, (t) => {
    if (t.date !== date || t.id === excludeId || !t.time) return false
    const start = timeToMinutes(t.time)
    const end = start + durationOf(t)
    return newStart < end && start < newEnd
  })

  return map(overlapping, (t) => {
    const end = timeToMinutes(t.time) + durationOf(t)
    return { groupId: t.groupId, start: t.time, end: minutesToTime(end) }
  })
}

export interface MarkResult {
  studentId: string
  name: string
  sub: Subscription | null
  status: DeductStatus
}

/**
 * Mark students as attended. The backend deducts a session per attendee and
 * records visits atomically via the attendees endpoint; we then read each
 * student's resulting subscription to report status back to the UI.
 */
export async function markAttendance(
  training: Training,
  studentIds: string[],
): Promise<MarkResult[]> {
  if (!studentIds.length) return []

  await addAttendees(training.id, studentIds)

  const results: MarkResult[] = []
  for (const sid of studentIds) {
    const student = await getStudentById(sid)
    if (!student) continue

    const sub =
      student.subscriptions.find((s) => s.groupId === training.groupId) ?? null

    let status: DeductStatus = 'none'
    if (sub) {
      if (!sub.isActive) status = 'expired'
      else if (sub.remaining <= 2) status = 'ending'
      else status = 'ok'
    }

    results.push({ studentId: sid, name: student.name, sub, status })
  }

  return results
}

/** Human-readable group schedule string. */
export function formatSchedule(group: Group | null): string {
  if (!group) return ''

  const schedule = group.schedule ?? []
  if (isEmpty(schedule) && !group.duration) return 'Расписание не задано'

  let schedulePart = ''
  if (!isEmpty(schedule)) {
    const byTime = new Map<string, string[]>()
    for (const { day, time } of schedule) {
      const key = time || ''
      if (!byTime.has(key)) byTime.set(key, [])
      byTime.get(key)!.push(day)
    }
    schedulePart = [...byTime.entries()]
      .map(([time, days]) => days.join(', ') + (time ? ' ' + time : ''))
      .join(' | ')
  }

  const parts: string[] = []
  if (schedulePart) parts.push(schedulePart)
  if (group.duration) parts.push(group.duration + ' мин')
  return parts.join(' · ') || 'Расписание не задано'
}
