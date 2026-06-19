import { subscriptionTariffOptions } from './sub-tariff-options'

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

describe('subscriptionTariffOptions — одна группа', () => {
  it('берёт только тарифы своего вида', () => {
    const rules = [
      rule({ id: 'g', lesson_kind: 'group' }),
      rule({ id: 'i', lesson_kind: 'individual' }),
      rule({ id: 's', lesson_kind: 'shared' }),
    ]
    expect(
      subscriptionTariffOptions(rules, { isShared: false, lessonKind: 'group' }).map((r) => r.id),
    ).toEqual(['g'])
  })
})

describe('subscriptionTariffOptions — несколько групп (общий)', () => {
  it('включает и общие, и групповые тарифы; исключает individual/pair', () => {
    const rules = [
      rule({ id: 'g4', lesson_kind: 'group', sessions_count: 4 }),
      rule({ id: 'sh8', lesson_kind: 'shared', sessions_count: 8 }),
      rule({ id: 'ind', lesson_kind: 'individual' }),
      rule({ id: 'pair', lesson_kind: 'pair' }),
    ]
    expect(
      subscriptionTariffOptions(rules, { isShared: true, lessonKind: 'shared' })
        .map((r) => r.id)
        .sort(),
    ).toEqual(['g4', 'sh8'])
  })

  it('при равном числе занятий общий тариф идёт ниже группового', () => {
    const rules = [
      rule({ id: 'sh8', lesson_kind: 'shared', sessions_count: 8 }),
      rule({ id: 'g8', lesson_kind: 'group', sessions_count: 8 }),
    ]
    expect(
      subscriptionTariffOptions(rules, { isShared: true, lessonKind: 'shared' }).map((r) => r.id),
    ).toEqual(['g8', 'sh8'])
  })

  it('исключает неактивные', () => {
    const rules = [
      rule({ id: 'g', lesson_kind: 'group', active: true }),
      rule({ id: 'gOff', lesson_kind: 'group', active: false }),
    ]
    expect(
      subscriptionTariffOptions(rules, { isShared: true, lessonKind: 'shared' }).map((r) => r.id),
    ).toEqual(['g'])
  })

  it('разовое сверху, затем по возрастанию числа', () => {
    const rules = [
      rule({ id: 'g8', format: 'subscription', sessions_count: 8 }),
      rule({ id: 'single', format: 'single', sessions_count: 1 }),
      rule({ id: 'g4', format: 'subscription', sessions_count: 4 }),
    ]
    expect(
      subscriptionTariffOptions(rules, { isShared: true, lessonKind: 'shared' }).map((r) => r.id),
    ).toEqual(['single', 'g4', 'g8'])
  })
})
