import { clientTypeToTuple, matchRule } from 'entities/finance/lib/rule-match'
import { findSubForGroup } from 'entities/students/model/subscription-status'

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
 * это billing[] из ответа бэка; зеркалит attendance-pricing: парные никогда
 * не списывают абонемент, остальные — абонемент, иначе гейт (отметка без
 * абонемента в UI запрещена, ведёт в оформление).
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
  if (sub) return { kind: 'subscription', remaining: sub.remaining }
  return { kind: 'gated' }
}
