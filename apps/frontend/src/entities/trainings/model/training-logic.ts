import i18n from 'i18next'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

import { minutesToTime, timeToMinutes } from 'common/utils/date'
import { weekdayShortLabel } from 'common/utils/weekdays'
import { getGroups } from 'entities/groups/model/groups.repo'
import { getStudents } from 'entities/students/model/students.repo'

import { addAttendees, getTrainings } from './trainings.repo'

import type { BillingResult } from './trainings.repo'
import type { Training, TrainingConflict } from './types'
import type { Group } from 'entities/groups/model/types'
import type { DeductStatus } from 'entities/students/model/types'

import { isPrimeTime } from '@trikick/shared'

// Реэкспорт общей функции для совместимости с существующими импортами по пути
// 'entities/trainings/model/training-logic'. Логика прайм-тайма живёт в
// `@trikick/shared/lib/prime-time` — единственный источник правды для фронта
// и бэка.
export { isPrimeTime }

/** Чистая проверка наслоения по уже загруженным данным. */
function findConflicts(
  allTrainings: Training[],
  groupMap: Record<string, Group>,
  date: string,
  time: string,
  groupId: string,
  excludeIds: string[],
  sessionDuration?: number,
): TrainingConflict[] {
  // Для новой тренировки приоритет у явно переданной длительности (например,
  // индивидуальная сессия 90 мин), затем длительность группы, затем 60.
  const newDur = sessionDuration ?? groupMap[groupId]?.duration ?? 60
  const newStart = timeToMinutes(time)
  const newEnd = newStart + newDur

  // Для групповых тренировок канонический источник — настройка группы (duration),
  // потому что sessionDuration в записи может быть дефолтным 60 даже если группа
  // имеет другую длительность. Для индивидуальных — per-session sessionDuration,
  // потому что у одного тренера могут чередоваться 60- и 90-минутные сессии.
  const durationOf = (t: Training): number => {
    const group = groupMap[t.groupId]
    if (group?.isIndividual) {
      return t.sessionDuration ?? group.duration ?? 60
    }
    return group?.duration ?? t.sessionDuration ?? 60
  }

  const overlapping = filter(allTrainings, (t) => {
    if (t.date !== date || excludeIds.includes(t.id) || !t.time) return false
    const start = timeToMinutes(t.time)
    const end = start + durationOf(t)
    return newStart < end && start < newEnd
  })

  return map(overlapping, (t) => {
    const end = timeToMinutes(t.time) + durationOf(t)
    return { groupId: t.groupId, start: t.time, end: minutesToTime(end) }
  })
}

const toExcludeIds = (excludeId: string | string[] | null): string[] =>
  Array.isArray(excludeId) ? excludeId : excludeId ? [excludeId] : []

/** Trainings that overlap with a proposed slot. */
export async function checkTrainingConflict(
  date: string,
  time: string,
  groupId: string,
  excludeId: string | string[] | null = null,
  sessionDuration?: number,
): Promise<TrainingConflict[]> {
  if (!time) return []
  const [allTrainings, allGroups] = await Promise.all([getTrainings(), getGroups()])
  const groupMap: Record<string, Group> = Object.fromEntries(map(allGroups, (g) => [g.name, g]))
  return findConflicts(allTrainings, groupMap, date, time, groupId, toExcludeIds(excludeId), sessionDuration)
}

export interface SeriesSlot {
  date: string
  sessionDuration?: number
}

/**
 * Конфликтующие даты серии. Тренировки и группы грузятся ОДИН раз на всю
 * серию (а не на каждую дату, как при checkTrainingConflict в цикле).
 */
export async function checkSeriesConflicts(
  slots: SeriesSlot[],
  time: string,
  groupId: string,
  excludeId: string | string[] | null = null,
): Promise<string[]> {
  if (!time || !slots.length) return []
  const [allTrainings, allGroups] = await Promise.all([getTrainings(), getGroups()])
  const groupMap: Record<string, Group> = Object.fromEntries(map(allGroups, (g) => [g.name, g]))
  const excludeIds = toExcludeIds(excludeId)
  return slots
    .filter(
      (s) =>
        findConflicts(allTrainings, groupMap, s.date, time, groupId, excludeIds, s.sessionDuration)
          .length > 0,
    )
    .map((s) => s.date)
}

export interface MarkResult {
  studentId: string
  name: string
  billing: BillingResult['billing']
  /** Статус абонемента после списания; 'none' — списания не было. */
  status: DeductStatus
  remaining: number | null
}

/**
 * Отметить посещение. Биллинг (списание абонемента ИЛИ авто-платёж по тарифу)
 * целиком на бэке; здесь только маппинг ответа в результаты для тостов.
 */
export async function markAttendance(
  training: Training,
  studentIds: string[],
): Promise<MarkResult[]> {
  if (!studentIds.length) return []
  const { billing } = await addAttendees(training.id, studentIds)
  const students = await getStudents()
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? ''
  return billing.map((b) => ({
    studentId: b.studentId,
    name: nameOf(b.studentId),
    billing: b.billing,
    status: b.billing === 'subscription' ? ((b.subStatus ?? 'ok') as DeductStatus) : 'none',
    remaining: b.remaining,
  }))
}

/** Human-readable group schedule string. */
export function formatSchedule(group: Group | null): string {
  if (!group) return ''

  const schedule = group.schedule ?? []
  if (isEmpty(schedule) && !group.duration) return i18n.t('groups.schedule.notSet')

  let schedulePart = ''
  if (!isEmpty(schedule)) {
    const byTime = new Map<string, string[]>()
    for (const { day, time } of schedule) {
      const key = time || ''
      if (!byTime.has(key)) byTime.set(key, [])
      byTime.get(key)!.push(day)
    }
    schedulePart = [...byTime.entries()]
      .map(([time, days]) => days.map(weekdayShortLabel).join(', ') + (time ? ' ' + time : ''))
      .join(' | ')
  }

  const parts: string[] = []
  if (schedulePart) parts.push(schedulePart)
  if (group.duration) parts.push(i18n.t('groups.schedule.minutes', { count: group.duration }))
  return parts.join(' · ') || i18n.t('groups.schedule.notSet')
}
