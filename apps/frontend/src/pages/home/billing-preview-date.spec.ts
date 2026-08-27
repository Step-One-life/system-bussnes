import { previewBilling } from './billing-preview'

import type { Student, Subscription } from 'entities/students/model/types'

import { describe, expect, it } from 'vitest'

let seq = 0
function sub(over: Partial<Subscription> = {}): Subscription {
  seq += 1
  return {
    id: `sub-${seq}`,
    groupId: 'Старт',
    groupIds: ['Старт'],
    type: 'sub',
    total: 8,
    remaining: 4,
    createdAt: '2026-07-01',
    expiresAt: '2026-08-20',
    isActive: true,
    finPaymentId: null,
    sessionDuration: 60,
    timeSlot: 'regular',
    isPair: false,
    isUnlimited: false,
    ...over,
  }
}

function student(subs: Subscription[]): Student {
  return {
    id: 'st-1',
    name: 'Ученик',
    phone: null,
    note: null,
    groups: ['Старт'],
    subscriptions: subs,
    visitHistory: [],
    createdAt: '2026-01-01',
  }
}

const base = { groupId: 'Старт', isPair: false, isPrime: false, sessionDuration: 60, rules: [] }

// D10/S1: зеркало бэкового pickSubForDeduct — гейт отметки обязан смотреть
// на дату занятия, иначе тренер уводится в «Оформить» и клиент платит дважды.
describe('previewBilling — дата занятия', () => {
  it('на дату занятия абонемент ещё действовал — списание, а не гейт', () => {
    const res = previewBilling({ ...base, student: student([sub()]), onDate: '2026-08-05' })
    expect(res).toEqual({ kind: 'subscription', remaining: 4 })
  })

  it('на дату клика тот же абонемент истёк — гейт (старое поведение)', () => {
    const res = previewBilling({ ...base, student: student([sub()]), onDate: '2026-08-27' })
    expect(res).toEqual({ kind: 'gated' })
  })

  it('день истечения включительно', () => {
    const res = previewBilling({ ...base, student: student([sub()]), onDate: '2026-08-20' })
    expect(res.kind).toBe('subscription')
  })

  it('без абонемента — гейт независимо от даты', () => {
    expect(previewBilling({ ...base, student: student([]), onDate: '2026-08-05' }).kind).toBe('gated')
  })
})
