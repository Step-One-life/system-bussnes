import { shiftISODate } from 'common/utils/date'

/**
 * Скользящее окно загрузки тренировок: главная и календарь живут «около
 * сегодня», тянуть всю историю на каждое открытие не нужно. Прошлое покрывает
 * квартал (визиты ученика живут в его карточке и не зависят от окна), будущее —
 * полгода (дальние занятия серий существуют на бэке и вернутся в окно со
 * временем; операции над серией идут по recurringId по ВСЕМ занятиям).
 */
export const WINDOW_PAST_DAYS = 90
export const WINDOW_FUTURE_DAYS = 180

/** Границы окна (обе включительно) для данного «сегодня» YYYY-MM-DD. */
export function trainingsWindow(todayIso: string): { from: string; to: string } {
  return {
    from: shiftISODate(todayIso, -WINDOW_PAST_DAYS),
    to: shiftISODate(todayIso, WINDOW_FUTURE_DAYS),
  }
}
