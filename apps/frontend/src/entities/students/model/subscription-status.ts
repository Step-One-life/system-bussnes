import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

import i18n from 'i18next'

import type { Student, Subscription, SubStatus } from './types'

export function subTypeLabel(type: string): string {
  return i18n.t(`students.subTypes.${type}`, { defaultValue: type })
}

/** Days until subscription expires (null if no expiresAt). */
export function getDaysRemaining(sub: Subscription | null): number | null {
  if (!sub || !sub.expiresAt) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Parse as local midnight (not UTC) so the day count matches the calendar
  // day for the user's timezone.
  const expiry = new Date(sub.expiresAt + 'T00:00:00')
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** Покрывает ли абонемент группу (общий — по списку groupIds). */
function covers(sub: Subscription, groupId: string): boolean {
  return sub.groupIds?.length ? sub.groupIds.includes(groupId) : sub.groupId === groupId
}

/**
 * Активный абонемент, которым бэк спишет занятие в группе. Зеркало
 * SubscriptionsService.deduct: «свой» абонемент группы с совпадающей
 * длительностью → любой «свой» → общий, покрывающий группу.
 */
export function findSubForGroup(
  student: Student,
  groupId: string,
  sessionDuration: number | null = null,
): Subscription | null {
  const active = student.subscriptions.filter((s) => s.isActive)
  return (
    (sessionDuration !== null
      ? active.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration)
      : undefined) ??
    active.find((s) => s.groupId === groupId) ??
    active.find((s) => covers(s, groupId)) ??
    null
  )
}

/** Subscription status for a student in a given group. */
export function getSubStatus(
  student: Student,
  groupId: string,
  sessionDuration: number | null = null,
): SubStatus {
  const sub = findSubForGroup(student, groupId, sessionDuration)

  if (!sub) {
    const any = find(student.subscriptions, (s) => covers(s, groupId))
    if (any) return { label: i18n.t('students.status.renew'), type: 'expired' }
    return { label: i18n.t('students.status.none'), type: 'none' }
  }

  const days = getDaysRemaining(sub)

  if (days !== null && days < 0)
    return { label: i18n.t('students.status.expired'), type: 'expired' }
  if (sub.remaining === 0)
    return { label: i18n.t('students.status.renew'), type: 'expired' }
  if (
    sub.type !== '1' &&
    sub.type !== '1_90' &&
    (sub.remaining <= 1 || (days !== null && days <= 7))
  ) {
    return { label: i18n.t('students.status.ending'), type: 'ending' }
  }
  return { label: i18n.t('students.status.active'), type: 'active' }
}

/** Worst status across all of a student's groups. */
export function getOverallSubStatus(student: Student): SubStatus {
  if (isEmpty(student.groups))
    return { label: i18n.t('students.status.noGroups'), type: 'none' }

  const statuses = map(student.groups, (g) => getSubStatus(student, g))
  const priority: Record<string, number> = { expired: 3, ending: 2, active: 1, none: 0 }
  statuses.sort((a, b) => (priority[b.type] ?? 0) - (priority[a.type] ?? 0))
  return statuses[0]
}

/** Progress bar fill % and colour class for a subscription. */
export function getSubProgress(sub: Subscription | null): {
  pct: number
  cls: 'ok' | 'warn' | 'danger'
} {
  if (!sub || sub.total === 0) return { pct: 0, cls: 'danger' }
  const pct = Math.round((sub.remaining / sub.total) * 100)
  let cls: 'ok' | 'warn' | 'danger' = 'ok'
  if (sub.remaining === 0) cls = 'danger'
  else if (sub.remaining === 1 && sub.total > 1) cls = 'danger'
  else if (sub.remaining === 2 && sub.total > 2) cls = 'warn'
  return { pct, cls }
}
