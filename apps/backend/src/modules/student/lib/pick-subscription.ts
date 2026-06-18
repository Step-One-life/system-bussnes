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
  isPair: boolean
  isUnlimited: boolean
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
 *
 * `wantPair` различает парный/индивидуальный абонемент на общей группе-контейнере:
 * парная тренировка списывает только парные (is_pair=true), остальные — только не-парные.
 *
 * Безлимитные абонементы стоят в очереди последними: сначала расходуются считаемые
 * пакеты, и только если их нет — засчитывается безлимит (он не уменьшает счётчик).
 */
export function pickSubForDeduct<T extends PickableSub>(
  subs: T[],
  groupId: string,
  sessionDuration: number | null,
  today: string,
  wantPair = false,
): T | null {
  const pool = subs
    .filter((s) => isNotExpired(s, today) && s.isPair === wantPair)
    .sort((a, b) => Number(a.isUnlimited) - Number(b.isUnlimited))
  return (
    (sessionDuration !== null
      ? pool.find((s) => s.groupId === groupId && s.sessionDuration === sessionDuration)
      : undefined) ??
    pool.find((s) => s.groupId === groupId) ??
    pool.find((s) => covers(s, groupId)) ??
    null
  )
}
