import { isValidTotal, minTotal, nextRemaining, prefillIncome, usedSessions } from './edit-sub'

import type { PricingRule } from 'entities/finance/model/types'

import { describe, expect, it } from 'vitest'

const sub = { total: 8, remaining: 5, isUnlimited: false } // used = 3

describe('edit-sub helpers', () => {
  it('usedSessions = total − remaining', () => {
    expect(usedSessions(sub)).toBe(3)
  })

  it('minTotal = max(used, 1); used=0 → 1', () => {
    expect(minTotal(sub)).toBe(3)
    expect(minTotal({ total: 4, remaining: 4 })).toBe(1) // used=0
  })

  it('nextRemaining: used сохраняется', () => {
    expect(nextRemaining(sub, 12)).toBe(9) // 12 − 3
    expect(nextRemaining(sub, 3)).toBe(0) // ровно до использованных
  })

  it('isValidTotal: меньше used → false', () => {
    expect(isValidTotal(sub, 2)).toBe(false)
    expect(isValidTotal(sub, 3)).toBe(true)
    expect(isValidTotal(sub, 100)).toBe(true)
  })

  it('isValidTotal: безлимит всегда true', () => {
    expect(isValidTotal({ total: 1, remaining: 1, isUnlimited: true }, 0)).toBe(true)
  })

  const rule = {
    client_price: 4000,
    client_prime_price: 6000,
    sessions_count: 8,
  } as PricingRule

  it('prefillIncome: пропорция от цены блока', () => {
    // 4000 / 8 = 500 за занятие; +4 = 2000
    expect(prefillIncome(rule, 4, false)).toBe(2000)
  })

  it('prefillIncome: прайм → прайм-цена блока', () => {
    // 6000 / 8 = 750; +2 = 1500
    expect(prefillIncome(rule, 2, true)).toBe(1500)
  })

  it('prefillIncome: нет тарифа или addedCount ≤ 0 → null', () => {
    expect(prefillIncome(null, 4, false)).toBeNull()
    expect(prefillIncome(rule, 0, false)).toBeNull()
    expect(prefillIncome(rule, -2, false)).toBeNull()
  })
})
