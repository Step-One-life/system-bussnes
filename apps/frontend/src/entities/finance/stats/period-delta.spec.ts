import { periodDelta } from './period-delta'

import type { FinanceTotals } from './finance-totals'

import { describe, expect, it } from 'vitest'

function totals(over: Partial<FinanceTotals> = {}): FinanceTotals {
  return {
    totalIncome: 0,
    totalHall: 0,
    netIncome: 0,
    margin: 0,
    avgCheck: 0,
    activeCount: 0,
    recordCount: 0,
    ...over,
  }
}

describe('periodDelta', () => {
  it('рост и падение в процентах с округлением', () => {
    const d = periodDelta(
      totals({ totalIncome: 56000, totalHall: 9000, netIncome: 47000 }),
      totals({ totalIncome: 50000, totalHall: 10000, netIncome: 40000 }),
    )
    expect(d.incomePct).toBe(12)
    expect(d.hallPct).toBe(-10)
    expect(d.netPct).toBe(18) // 7000/40000 = 17.5 → 18
  })

  it('нулевая база → null (сравнивать не с чем)', () => {
    const d = periodDelta(
      totals({ totalIncome: 5000, totalHall: 1000, netIncome: 4000 }),
      totals(),
    )
    expect(d).toEqual({ incomePct: null, hallPct: null, netPct: null })
  })

  it('отрицательная база: выход из минуса в плюс — положительная дельта', () => {
    const d = periodDelta(totals({ netIncome: 2000 }), totals({ netIncome: -1000 }))
    expect(d.netPct).toBe(300) // (2000 − (−1000)) / 1000
  })

  it('без изменений — 0%', () => {
    const d = periodDelta(totals({ totalIncome: 100 }), totals({ totalIncome: 100 }))
    expect(d.incomePct).toBe(0)
  })
})
