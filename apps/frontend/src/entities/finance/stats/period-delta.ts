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
