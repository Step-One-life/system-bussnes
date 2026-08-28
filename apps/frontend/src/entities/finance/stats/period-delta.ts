import { daysBetweenISO, shiftISODate, todayISO } from 'common/utils/date'

import type { FinanceTotals } from './finance-totals'

export interface PeriodDelta {
  /** Изменение к прошлому периоду, %: null = прошлый период по нулям. */
  incomePct: number | null
  hallPct: number | null
  netPct: number | null
}

/** (cur − prev) / |prev| в процентах; при нулевой базе сравнивать не с чем. */
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((cur - prev) / Math.abs(prev)) * 100)
}

/** Дельты ключевых итогов к прошлому периоду той же длины. */
export function periodDelta(cur: FinanceTotals, prev: FinanceTotals): PeriodDelta {
  return {
    incomePct: pct(cur.totalIncome, prev.totalIncome),
    hallPct: pct(cur.totalHall, prev.totalHall),
    netPct: pct(cur.netIncome, prev.netIncome),
  }
}

export interface PeriodRange {
  start: string | null
  end: string | null
}

/**
 * Обрезать прошлый период по той же прошедшей доле, что и текущий: сравнивать
 * первые N дней месяца с первыми N днями прошлого, а не с целым месяцем.
 * Иначе 3-го числа доход за три дня делится на весь прошлый месяц и даёт
 * красное «▼ 90%» — так каждый день, кроме последнего.
 */
export function clipToElapsed(current: PeriodRange, previous: PeriodRange): PeriodRange {
  if (!current.start || !previous.start) return previous
  const elapsedDays = daysBetweenISO(current.start, todayISO())
  if (elapsedDays < 0) return previous
  const prevEnd = shiftISODate(previous.start, elapsedDays)
  // Дальше конца прошлого периода не заходим (февраль короче марта).
  const end = previous.end && prevEnd > previous.end ? previous.end : prevEnd
  return { start: previous.start, end }
}
