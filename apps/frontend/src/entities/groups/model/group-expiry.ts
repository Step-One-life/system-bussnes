/**
 * Логика срока годности группы. `expiresAt` — дата (YYYY-MM-DD), ДО которой
 * включительно группа активна; null/пусто — бессрочная. Сравнение строк ISO
 * (YYYY-MM-DD) лексикографически корректно.
 */

/** Активна ли группа на дату `dateISO` (расписание порождает занятия). */
export function isGroupActiveOn(expiresAt: string | null | undefined, dateISO: string): boolean {
  return !expiresAt || dateISO <= expiresAt
}

/** Истекла ли группа на сегодня `todayISO` (дата прошла). */
export function isGroupExpired(expiresAt: string | null | undefined, todayISO: string): boolean {
  return !!expiresAt && todayISO > expiresAt
}
