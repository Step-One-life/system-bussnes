import filter from 'lodash/filter'
import find from 'lodash/find'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import size from 'lodash/size'
import some from 'lodash/some'

import { getStudents } from 'entities/students/model/students.repo'
import {
  getOverallSubStatus,
  getSubStatus,
} from 'entities/students/model/subscription-status'
import { getTrainings } from 'entities/trainings/model/trainings.repo'

import type { Student, Subscription, SubStatus } from 'entities/students/model/types'

export interface DashboardKPIs {
  total: number
  monthTrainings: number
  ending: number
  expired: number
}

export interface WarningEntry {
  student: Student
  groupId: string
  sub: Subscription | null
  status: SubStatus
}

/**
 * KPI главной — чистая функция от уже загруженных списков (кэшей react-query).
 * Раньше это была async-обёртка с собственными запросами под отдельным
 * query-ключом ['kpis'], который никто не инвалидировал: после продления или
 * отметки плашки оставались старыми, а главная качала /students трижды.
 */
export function computeKPIs(
  students: Student[],
  trainings: { date: string }[],
  now: Date,
): DashboardKPIs {
  const month = now.getMonth()
  const year = now.getFullYear()

  const monthTrainings = size(
    filter(trainings, (t) => {
      const d = new Date(t.date + 'T00:00:00')
      return d.getMonth() === month && d.getFullYear() === year
    }),
  )

  let active = 0
  let ending = 0
  let expired = 0
  for (const s of students) {
    const overall = getOverallSubStatus(s)
    if (overall.type === 'expired') expired++
    else if (overall.type === 'ending') ending++

    // total — активные ученики: есть хотя бы одна не-просроченная (active/ending)
    // подписка, даже если в другой группе абонемент истёк. (getOverallSubStatus
    // берёт ХУДШИЙ статус, поэтому отдельно считаем «есть живой абонемент».)
    const hasNonExpired =
      !isEmpty(s.groups) &&
      some(s.groups, (g) => {
        const type = getSubStatus(s, g).type
        return type === 'active' || type === 'ending'
      })
    if (hasNonExpired) active++
  }

  return { total: active, monthTrainings, ending, expired }
}

/** Предупреждения «Требует внимания» — чистая производная списка учеников. */
export function computeWarnings(students: Student[]): WarningEntry[] {
  const warnings: WarningEntry[] = []
  for (const s of students) {
    for (const groupId of s.groups) {
      const status = getSubStatus(s, groupId)
      if (status.type === 'ending' || status.type === 'expired') {
        const sub = find(s.subscriptions, (sub) => sub.groupId === groupId) ?? null
        warnings.push({ student: s, groupId, sub, status })
      }
    }
  }
  return warnings
}

export interface IndividualKPIs {
  clients: number
  monthSessions: number
  weekSessions: number
  expiring: number
}

export async function getIndividualKPIs(indGroupNames: string[]): Promise<IndividualKPIs> {
  if (isEmpty(indGroupNames)) {
    return { clients: 0, monthSessions: 0, weekSessions: 0, expiring: 0 }
  }

  const [students, trainings] = await Promise.all([getStudents(), getTrainings()])
  const clients = filter(students, (s) =>
    some(s.groups, (g) => includes(indGroupNames, g)),
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)

  const indTrainings = filter(trainings, (t) => includes(indGroupNames, t.groupId))
  const monthSessions = size(filter(indTrainings, (t) => new Date(t.date + 'T00:00:00') >= startOfMonth))
  const weekSessions = size(filter(indTrainings, (t) => new Date(t.date + 'T00:00:00') >= startOfWeek))

  let expiring = 0
  for (const s of clients) {
    const hasIssue = some(
      filter(s.groups, (g) => includes(indGroupNames, g)),
      (g) => {
        const st = getSubStatus(s, g)
        return st.type === 'expired' || st.type === 'ending'
      },
    )
    if (hasIssue) expiring++
  }

  return { clients: clients.length, monthSessions, weekSessions, expiring }
}

export async function getIndividualWarnings(indGroupNames: string[]): Promise<WarningEntry[]> {
  const students = await getStudents()
  const warnings: WarningEntry[] = []
  for (const s of students) {
    for (const groupId of filter(s.groups, (g) => includes(indGroupNames, g))) {
      const status = getSubStatus(s, groupId)
      if (status.type === 'ending' || status.type === 'expired') {
        const sub = find(s.subscriptions, (sub) => sub.groupId === groupId) ?? null
        warnings.push({ student: s, groupId, sub, status })
      }
    }
  }
  return warnings
}

export async function getStudentsByGroup(groupId: string): Promise<Student[]> {
  const students = await getStudents()
  return filter(students, (s) => includes(s.groups, groupId))
}

export async function getGroupStats(groupId: string) {
  const students = await getStudentsByGroup(groupId)
  let active = 0
  let ending = 0
  let expired = 0
  for (const s of students) {
    const st = getSubStatus(s, groupId)
    if (st.type === 'active') active++
    else if (st.type === 'ending') ending++
    else if (st.type === 'expired') expired++
  }
  return { total: students.length, active, ending, expired }
}
