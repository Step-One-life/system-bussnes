import type { PricingRule } from 'entities/finance/model/types'
import type { Student, Subscription } from 'entities/students/model/types'

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

// ── Внутренние копии чистой логики (без runtime-импортов из entities-barrel) ──

/** Покрывает ли абонемент группу (общий — по списку groupIds). */
function covers(sub: Subscription, groupId: string): boolean {
  return sub.groupIds?.length ? sub.groupIds.includes(groupId) : sub.groupId === groupId
}

/**
 * Активный абонемент, которым бэк спишет занятие. Зеркало findSubForGroup из
 * entities/students/model/subscription-status (barrel тянет UI → window).
 */
function pickSub(
  student: Student,
  groupId: string,
  sessionDuration: number,
): Subscription | null {
  const active = student.subscriptions.filter((s) => s.isActive)
  return (
    active.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration) ??
    active.find((s) => s.groupId === groupId) ??
    active.find((s) => covers(s, groupId)) ??
    null
  )
}

/** Находит парный тариф в списке правил. */
function findPairRule(rules: PricingRule[], durationMinutes: number): PricingRule | null {
  return (
    rules.find(
      (r) =>
        r.lesson_kind === 'pair' &&
        r.format === 'single' &&
        r.duration_minutes === durationMinutes &&
        r.sessions_count === 1,
    ) ?? null
  )
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
    const rule = findPairRule(rules, sessionDuration)
    if (!rule) return { kind: 'payment', amount: null }
    return { kind: 'payment', amount: isPrime ? rule.client_prime_price : rule.client_price }
  }
  const sub = pickSub(student, groupId, sessionDuration)
  if (sub) return { kind: 'subscription', remaining: sub.remaining }
  return { kind: 'gated' }
}
