import i18n from 'i18next'

/**
 * Канонические аббревиатуры дней недели — ФОРМАТ ХРАНЕНИЯ в group.schedule
 * (поле day). Не переводить и не менять: это данные, а не подписи.
 * Для отображения использовать weekdayShortLabel/weekdayFullLabel.
 */
export const WEEKDAY_ABBRS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

const ABBR_TO_KEY: Record<string, string> = {
  Пн: 'mon',
  Вт: 'tue',
  Ср: 'wed',
  Чт: 'thu',
  Пт: 'fri',
  Сб: 'sat',
  Вс: 'sun',
}

/** «Пн» → подпись на текущем языке («Пн» / "Mon"). */
export function weekdayShortLabel(abbr: string): string {
  const key = ABBR_TO_KEY[abbr]
  return key ? i18n.t(`weekdays.short.${key}`) : abbr
}

/** «Пн» → полное название на текущем языке («Понедельник» / "Monday"). */
export function weekdayFullLabel(abbr: string): string {
  const key = ABBR_TO_KEY[abbr]
  return key ? i18n.t(`weekdays.full.${key}`) : abbr
}
