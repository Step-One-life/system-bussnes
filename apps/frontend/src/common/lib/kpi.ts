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

export async function getKPIs(): Promise<DashboardKPIs> {
  const [students, trainings] = await Promise.all([getStudents(), getTrainings()])

  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  const monthTrainings = size(
    filter(trainings, (t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    }),
  )

  let active = 0
  let ending = 0
  let expired = 0
  for (const s of students) {
    const status = getOverallSubStatus(s)
    if (status.type === 'expired') expired++
    else if (status.type === 'ending') ending++
    else if (status.type === 'active') active++
  }

  // total — активные ученики (есть хотя бы одна не-просроченная подписка).
  // Раньше показывало всех students.length, включая «без групп» / только с
  // expired-подписками — это давало тренеру неверную картину масштаба.
  return { total: active + ending, monthTrainings, ending, expired }
}

export async function getWarningStudents(): Promise<WarningEntry[]> {
  const students = await getStudents()
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
  const monthSessions = size(filter(indTrainings, (t) => new Date(t.date) >= startOfMonth))
  const weekSessions = size(filter(indTrainings, (t) => new Date(t.date) >= startOfWeek))

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
