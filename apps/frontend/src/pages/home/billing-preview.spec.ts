import { previewBilling } from './billing-preview'

import type { PricingRule } from 'entities/finance/model/types'
import type { Student } from 'entities/students'

import { describe, expect, it } from 'vitest'

const sub = (groupId: string, remaining: number) =>
  ({ groupId, remaining, isActive: true, groupIds: [] }) as unknown

function student(subs: unknown[]): Student {
  return { id: 's1', name: 'Вася', subscriptions: subs } as unknown as Student
}

// matchRule матчит по: lesson_kind, format, duration_minutes, sessions_count
const pairRule = {
  lesson_kind: 'pair',
  format: 'single',
  duration_minutes: 60,
  sessions_count: 1,
  client_price: 1200,
  client_prime_price: 1500,
} as unknown as PricingRule

describe('previewBilling', () => {
  it('активный абонемент — спишется занятие', () => {
    const res = previewBilling({
      student: student([sub('Старт', 3)]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'subscription', remaining: 3 })
  })
  it('парное — разовый платёж по тарифу (прайм-цена в прайм)', () => {
    const base = {
      student: student([]),
      groupId: 'Индивидуальные',
      isPair: true,
      sessionDuration: 60,
      rules: [pairRule],
    }
    expect(previewBilling({ ...base, isPrime: false })).toEqual({ kind: 'payment', amount: 1200 })
    expect(previewBilling({ ...base, isPrime: true })).toEqual({ kind: 'payment', amount: 1500 })
  })
  it('парное без тарифа — платёж без суммы', () => {
    const res = previewBilling({
      student: student([]),
      groupId: 'Индивидуальные',
      isPair: true,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'payment', amount: null })
  })
  it('без абонемента (не парное) — гейт', () => {
    const res = previewBilling({
      student: student([]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'gated' })
  })
  it('абонемент истёк по сроку (isActive ещё true) — гейт, как на сервере', () => {
    const expired = {
      groupId: 'Старт',
      remaining: 3,
      isActive: true,
      groupIds: [],
      expiresAt: '2000-01-01',
    } as unknown
    const res = previewBilling({
      student: student([expired]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'gated' })
  })
  it('неактивный абонемент в списке — гейт', () => {
    const inactive = { groupId: 'Старт', remaining: 0, isActive: false, groupIds: [] } as unknown
    const res = previewBilling({
      student: student([inactive]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'gated' })
  })
})
