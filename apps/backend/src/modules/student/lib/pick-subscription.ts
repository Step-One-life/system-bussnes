/**
 * Чистая логика выбора абонемента для списания занятия. Вынесена из
 * SubscriptionsService ради тестов и единственного источника правды
 * (фронтовый findSubForGroup зеркалит эту же цепочку).
 */

export interface PickableSub {
  groupId: string
  groupIds: string[] | null
  sessionDuration: number
  expiresAt: string
}

/** Действует ли абонемент на дату `today` (обе строки — ISO YYYY-MM-DD). */
export function isNotExpired(sub: { expiresAt: string }, today: string): boolean {
  return !sub.expiresAt || sub.expiresAt >= today
}

/** Покрывает ли абонемент группу (общий — по списку groupIds). */
export function covers(sub: PickableSub, groupId: string): boolean {
  return sub.groupIds?.length ? sub.groupIds.includes(groupId) : sub.groupId === groupId
}

/**
 * Абонемент для списания: «свой» абонемент группы с совпадающей длительностью →
 * любой «свой» → общий, покрывающий группу. Истёкшие по сроку не участвуют —
 * отметка без действующего абонемента уходит в авто-платёж по тарифу.
 */
export function pickSubForDeduct<T extends PickableSub>(
  subs: T[],
  groupId: string,
  sessionDuration: number | null,
  today: string,
): T | null {
  const pool = subs.filter((s) => isNotExpired(s, today))
  return (
    (sessionDuration !== null
      ? pool.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration)
      : undefined) ??
    pool.find((s) => s.groupId === groupId) ??
    pool.find((s) => covers(s, groupId)) ??
    null
  )
}
