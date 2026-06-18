import { findUnlinkedPayments } from './unlinked-payments'

import type { Payment } from '../model/types'

import { describe, expect, it } from 'vitest'

/** Минимальная фабрика платежа — для матчинга важны id, student_id, paid_at. */
function pay(over: Partial<Payment> & Pick<Payment, 'id'>): Payment {
  return {
    student_id: 's-1',
    location_id: null,
    group_id: null,
    client_payment_type: 'single_individual',
    client_amount: 4000,
    sessions_total: 1,
    sessions_remaining: 1,
    paid_at: '2026-05-25',
    status: 'paid',
    notes: '',
    hall_cost_id: null,
    ...over,
  } as Payment
}

describe('findUnlinkedPayments', () => {
  it('доход ученика без привязки → возвращается', () => {
    const p = pay({ id: 'p-1', student_id: 's-1' })
    expect(findUnlinkedPayments([p], 's-1', new Set())).toEqual([p])
  })

  it('доход уже привязан к абонементу (id в наборе) → исключается', () => {
    const p = pay({ id: 'p-1', student_id: 's-1' })
    expect(findUnlinkedPayments([p], 's-1', new Set(['p-1']))).toEqual([])
  })

  it('доход другого ученика → исключается', () => {
    const p = pay({ id: 'p-1', student_id: 's-2' })
    expect(findUnlinkedPayments([p], 's-1', new Set())).toEqual([])
  })

  it('доход с группы (student_id = null) → исключается', () => {
    const p = pay({ id: 'p-1', student_id: null, group_id: 'g-1' })
    expect(findUnlinkedPayments([p], 's-1', new Set())).toEqual([])
  })

  it('несколько непривязанных → сортируются от новых к старым', () => {
    const older = pay({ id: 'p-old', paid_at: '2026-05-01' })
    const newer = pay({ id: 'p-new', paid_at: '2026-05-25' })
    expect(findUnlinkedPayments([older, newer], 's-1', new Set())).toEqual([newer, older])
  })

  it('смешанный список → только непривязанные доходы нужного ученика', () => {
    const ownUnlinked = pay({ id: 'p-1', student_id: 's-1' })
    const ownLinked = pay({ id: 'p-2', student_id: 's-1' })
    const other = pay({ id: 'p-3', student_id: 's-2' })
    const result = findUnlinkedPayments([ownUnlinked, ownLinked, other], 's-1', new Set(['p-2']))
    expect(result).toEqual([ownUnlinked])
  })
})
