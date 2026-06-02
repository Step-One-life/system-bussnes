import find from 'lodash/find'
import isEmpty from 'lodash/isEmpty'
import map from 'lodash/map'

import type { Student, Subscription, SubStatus } from './types'

const SUB_TYPE_LABELS: Record<string, string> = {
  '1': 'Разовое',
  '4': '4 занятия',
  '8': '8 занятий',
  '1_90': 'Разовое 1.5ч',
  '4_90': '4 занятия 1.5ч',
  '8_90': '8 занятий 1.5ч',
}

export function subTypeLabel(type: string): string {
  return SUB_TYPE_LABELS[type] ?? type
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

/** Subscription status for a student in a given group. */
export function getSubStatus(student: Student, groupId: string): SubStatus {
  const sub = find(student.subscriptions, (s) => s.groupId === groupId && s.isActive)

  if (!sub) {
    const any = find(student.subscriptions, (s) => s.groupId === groupId)
    if (any) return { label: 'Нужно продлить', type: 'expired' }
    return { label: 'Нет абонемента', type: 'none' }
  }

  const days = getDaysRemaining(sub)

  if (days !== null && days < 0) return { label: 'Истёк срок', type: 'expired' }
  if (sub.remaining === 0) return { label: 'Нужно продлить', type: 'expired' }
  if (
    sub.type !== '1' &&
    sub.type !== '1_90' &&
    (sub.remaining <= 1 || (days !== null && days <= 7))
  ) {
    return { label: 'Заканчивается', type: 'ending' }
  }
  return { label: 'Активен', type: 'active' }
}

/** Worst status across all of a student's groups. */
export function getOverallSubStatus(student: Student): SubStatus {
  if (isEmpty(student.groups)) return { label: 'Нет групп', type: 'none' }

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
