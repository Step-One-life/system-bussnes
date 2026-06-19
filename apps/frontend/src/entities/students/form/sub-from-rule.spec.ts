import { subFromRule, tariffOptions } from './sub-from-rule'

import type { PricingRule } from 'entities/finance/model/types'

import { describe, expect, it } from 'vitest'

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: 'r',
  location_id: 'loc',
  title: '',
  lesson_kind: 'group',
  format: 'subscription',
  duration_minutes: 60,
  sessions_count: 4,
  client_price: 0,
  client_prime_price: 0,
  hall_cost: 0,
  hall_prime_cost: 0,
  active: true,
  validity_days: 35,
  created_at: '',
  ...over,
})

describe('tariffOptions', () => {
  it('оставляет только активные тарифы нужного вида', () => {
    const rules = [
      rule({ id: 'a', lesson_kind: 'group' }),
      rule({ id: 'b', lesson_kind: 'individual' }),
      rule({ id: 'c', lesson_kind: 'group', active: false }),
    ]
    expect(tariffOptions(rules, 'group').map((r) => r.id)).toEqual(['a'])
  })

  it('разовое сверху, затем абонементы по возрастанию числа занятий', () => {
    const rules = [
      rule({ id: 's8', format: 'subscription', sessions_count: 8 }),
      rule({ id: 'single', format: 'single', sessions_count: 1 }),
      rule({ id: 's4', format: 'subscription', sessions_count: 4 }),
    ]
    expect(tariffOptions(rules, 'group').map((r) => r.id)).toEqual(['single', 's4', 's8'])
  })

  it('кастомное число занятий попадает в список', () => {
    const rules = [rule({ id: 's12', format: 'subscription', sessions_count: 12 })]
    expect(tariffOptions(rules, 'group').map((r) => r.id)).toEqual(['s12'])
  })
})

describe('subFromRule', () => {
  it('разовое → тип «1» с числом занятий', () => {
    expect(subFromRule(rule({ format: 'single', sessions_count: 1 }))).toEqual({
      type: '1',
      isUnlimited: false,
      sessionsTotal: 1,
      sessionDuration: 60,
      validityDays: 35,
    })
  })

  it('абонемент → тип «sub» с числом занятий из тарифа', () => {
    expect(subFromRule(rule({ format: 'subscription', sessions_count: 12 }))).toEqual({
      type: 'sub',
      isUnlimited: false,
      sessionsTotal: 12,
      sessionDuration: 60,
      validityDays: 35,
    })
  })

  it('безлимит → «sub», без числа занятий, isUnlimited', () => {
    expect(
      subFromRule(rule({ format: 'unlimited', sessions_count: 4, duration_minutes: 90, validity_days: 30 })),
    ).toEqual({
      type: 'sub',
      isUnlimited: true,
      sessionsTotal: undefined,
      sessionDuration: 90,
      validityDays: 30,
    })
  })
})
