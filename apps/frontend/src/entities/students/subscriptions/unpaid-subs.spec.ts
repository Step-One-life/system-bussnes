import { findUnpaidSubscriptions } from './unpaid-subs'

import type { Subscription } from '../model/types'

import { describe, expect, it } from 'vitest'

/** Минимальная фабрика абонемента — для отбора важны finPaymentId и createdAt. */
function sub(over: Partial<Subscription> & Pick<Subscription, 'id'>): Subscription {
  return {
    groupId: 'Индивидуальные',
    groupIds: [],
    type: '1',
    total: 1,
    remaining: 1,
    createdAt: '2026-05-25',
    expiresAt: '2026-08-25',
    isActive: true,
    finPaymentId: null,
    sessionDuration: 60,
    timeSlot: 'regular',
    isPair: false,
    isUnlimited: false,
    ...over,
  }
}

describe('findUnpaidSubscriptions', () => {
  it('абонемент без finPaymentId → возвращается', () => {
    const s = sub({ id: 's-1', finPaymentId: null })
    expect(findUnpaidSubscriptions([s])).toEqual([s])
  })

  it('оплаченный абонемент (есть finPaymentId) → исключается', () => {
    const s = sub({ id: 's-1', finPaymentId: 'pay-1' })
    expect(findUnpaidSubscriptions([s])).toEqual([])
  })

  it('несколько неоплаченных → сортируются от новых к старым', () => {
    const older = sub({ id: 's-old', createdAt: '2026-05-01' })
    const newer = sub({ id: 's-new', createdAt: '2026-05-25' })
    expect(findUnpaidSubscriptions([older, newer])).toEqual([newer, older])
  })

  it('смешанный список → только неоплаченные', () => {
    const unpaid = sub({ id: 's-1', finPaymentId: null })
    const paid = sub({ id: 's-2', finPaymentId: 'pay-2' })
    expect(findUnpaidSubscriptions([unpaid, paid])).toEqual([unpaid])
  })

  it('пустой список → пусто', () => {
    expect(findUnpaidSubscriptions([])).toEqual([])
  })
})
