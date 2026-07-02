import { financeTotals } from './finance-totals'

import type { HallCost, Payment } from '../model/types'

import { describe, expect, it } from 'vitest'

const payment = (over: Partial<Payment> = {}): Payment =>
  ({ id: 'p1', client_amount: 0, status: 'active', paid_at: '2026-07-01', ...over }) as Payment

const hall = (over: Partial<HallCost> = {}): HallCost =>
  ({ id: 'h1', hall_amount: 0, paid_at: '2026-07-01', ...over }) as HallCost

describe('financeTotals', () => {
  it('пусто → нули без деления на ноль', () => {
    expect(financeTotals([], [])).toEqual({
      totalIncome: 0,
      totalHall: 0,
      netIncome: 0,
      margin: 0,
      avgCheck: 0,
      activeCount: 0,
      recordCount: 0,
    })
  })

  it('платёж со связанным расходом зала', () => {
    const t = financeTotals([payment({ client_amount: 1000 })], [hall({ hall_amount: 300 })])
    expect(t.totalIncome).toBe(1000)
    expect(t.totalHall).toBe(300)
    expect(t.netIncome).toBe(700)
    expect(t.margin).toBe(70)
  })

  it('standalone-расход зала (без платежа) уменьшает маржу', () => {
    const t = financeTotals(
      [payment({ client_amount: 1000 })],
      [hall({ hall_amount: 300 }), hall({ id: 'h2', hall_amount: 200 })],
    )
    // Раньше totalHall был бы 300: standalone-расход без p.hall_cost_id выпадал.
    expect(t.totalHall).toBe(500)
    expect(t.netIncome).toBe(500)
    expect(t.margin).toBe(50)
  })

  it('средний чек и счётчики считаются по платежам', () => {
    const t = financeTotals(
      [payment({ client_amount: 700 }), payment({ id: 'p2', client_amount: 300, status: 'closed' })],
      [],
    )
    expect(t.avgCheck).toBe(500)
    expect(t.recordCount).toBe(2)
    expect(t.activeCount).toBe(1)
  })
})
