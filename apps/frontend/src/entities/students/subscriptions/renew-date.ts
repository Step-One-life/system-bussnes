/** Режим выбора начала абонемента в модалке продления/оформления. */
export type StartMode = 'today' | 'tomorrow' | 'custom'

/** Итоговая ISO-дата начала из выбранного режима (чистая функция). */
export function resolveStartDate(
  mode: StartMode,
  today: string,
  tomorrow: string,
  custom: string,
): string {
  if (mode === 'tomorrow') return tomorrow
  if (mode === 'custom') return custom
  return today
}
