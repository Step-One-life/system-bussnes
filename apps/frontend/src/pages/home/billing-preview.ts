import { clientTypeToTuple, matchRule } from 'entities/finance/lib/rule-match'
import { findSubForGroup, getDaysRemaining } from 'entities/students/model/subscription-status'

import type { PricingRule } from 'entities/finance/model/types'
import type { Student } from 'entities/students/model/types'

export type BillingPreview =
  | { kind: 'subscription'; remaining: number }
  | { kind: 'payment'; amount: number | null }
  | { kind: 'gated' }

interface PreviewArgs {
  student: Student
  /** Имя группы (как в training.groupId на фронте). */
  groupId: string
  isPair: boolean
  isPrime: boolean
  sessionDuration: number
  /** Тарифы локации занятия. */
  rules: PricingRule[]
}

/**
 * Что произойдёт с деньгами при отметке. Оценка на клиенте — источник истины
 * это billing[] из ответа бэка. Зеркалит парный биллинг attendance-pricing и
 * UI-политику гейта (не-парный без действующего абонемента в UI не отмечается,
 * ведёт в оформление — сервер в этой ветке недостижим). Онлайн-разовые без
 * абонемента сюда не попадают (тоже гейт) — отдельного online-тарифа превью
 * не показывает.
 */
export function previewBilling(args: PreviewArgs): BillingPreview {
  const { student, groupId, isPair, isPrime, sessionDuration, rules } = args
  if (isPair) {
    const type = sessionDuration >= 90 ? 'single_pair_90' : 'single_pair'
    const rule = matchRule(rules, clientTypeToTuple(type))
    if (!rule) return { kind: 'payment', amount: null }
    return { kind: 'payment', amount: isPrime ? rule.client_prime_price : rule.client_price }
  }
  const sub = findSubForGroup(student, groupId, sessionDuration)
  // Зеркало серверного isNotExpired: истёкший по сроку абонемент сервер
  // не списывает, даже если isActive ещё не снят.
  const days = getDaysRemaining(sub)
  if (sub && (days === null || days >= 0)) return { kind: 'subscription', remaining: sub.remaining }
  return { kind: 'gated' }
}
