import type { Subscription } from '../model/types'
import type { PricingRule } from 'entities/finance/model/types'

type CountFields = Pick<Subscription, 'total' | 'remaining'>

/** Сколько занятий уже использовано (used = total − remaining). */
export function usedSessions(sub: CountFields): number {
  return sub.total - sub.remaining
}

/** Нижняя граница количества: не ниже использованных и не ноль. */
export function minTotal(sub: CountFields): number {
  return Math.max(usedSessions(sub), 1)
}

/** Остаток после смены количества (используемые занятия сохраняются). */
export function nextRemaining(sub: CountFields, newTotal: number): number {
  return newTotal - usedSessions(sub)
}

/** Валидно ли новое количество — остаток не уходит в минус. Безлимит всегда ок. */
export function isValidTotal(
  sub: CountFields & Pick<Subscription, 'isUnlimited'>,
  newTotal: number,
): boolean {
  if (sub.isUnlimited) return true
  return Number.isFinite(newTotal) && newTotal >= minTotal(sub)
}

/**
 * Префилл дохода за ДОБАВЛЕННЫЕ занятия. Тариф хранит цену за весь блок
 * sessions_count занятий (не за занятие), поэтому считаем пропорцию.
 * null — если тариф не найден (поле остаётся пустым, тренер вводит вручную).
 */
export function prefillIncome(
  rule: PricingRule | null,
  addedCount: number,
  isPrime: boolean,
): number | null {
  if (!rule || addedCount <= 0 || !rule.sessions_count) return null
  const blockPrice = isPrime ? rule.client_prime_price : rule.client_price
  if (blockPrice == null) return null
  return Math.round((blockPrice / rule.sessions_count) * addedCount)
}
