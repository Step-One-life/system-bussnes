import { findSubForGroup } from './subscription-status'

import type { Student, Subscription } from './types'

import { describe, expect, it } from 'vitest'

function sub(over: Partial<Subscription>): Subscription {
  return {
    id: '1',
    groupId: 'g1',
    groupIds: [],
    type: 'sub',
    total: 8,
    remaining: 4,
    createdAt: '2026-01-01',
    expiresAt: '2099-12-31',
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
    id: 's1',
    name: 'Тест',
    phone: null,
    note: null,
    groups: ['g1'],
    subscriptions: subs,
    visitHistory: [],
    createdAt: '2026-01-01',
  }
}

// M1: findSubForGroup зеркалит бэковый pickSubForDeduct — выбирает тот же
// абонемент, что спишет сервер (истёкшие по сроку отсеиваются, безлимит — в
// конце очереди). Иначе превью остатка показывало бы не тот абонемент.
describe('findSubForGroup', () => {
  it('возвращает действующий абонемент', () => {
    const s = sub({ expiresAt: '2099-12-31' })
    expect(findSubForGroup(student([s]), 'g1')).toBe(s)
  })

  it('пропускает истёкший по сроку, даже если isActive=true', () => {
    const expired = sub({ expiresAt: '2020-01-01' })
    expect(findSubForGroup(student([expired]), 'g1')).toBeNull()
  })

  it('предпочитает действующий истёкшему, когда есть оба', () => {
    const expired = sub({ id: 'exp', expiresAt: '2020-01-01' })
    const valid = sub({ id: 'ok', expiresAt: '2099-12-31' })
    expect(findSubForGroup(student([expired, valid]), 'g1')?.id).toBe('ok')
  })

  it('считаемый пакет приоритетнее безлимита (зеркало порядка бэка)', () => {
    const unlimited = sub({ id: 'ul', isUnlimited: true, remaining: 0, total: 0 })
    const counted = sub({ id: 'ct', isUnlimited: false, remaining: 3 })
    expect(findSubForGroup(student([unlimited, counted]), 'g1')?.id).toBe('ct')
  })

  it('берёт безлимит, если считаемых нет', () => {
    const unlimited = sub({ id: 'ul', isUnlimited: true, remaining: 0, total: 0 })
    expect(findSubForGroup(student([unlimited]), 'g1')?.id).toBe('ul')
  })

  it('совпадение по sessionDuration в приоритете', () => {
    const s60 = sub({ id: 's60', sessionDuration: 60 })
    const s90 = sub({ id: 's90', sessionDuration: 90 })
    expect(findSubForGroup(student([s60, s90]), 'g1', 90)?.id).toBe('s90')
  })

  it('парная тренировка берёт только парный абонемент', () => {
    const indiv = sub({ id: 'ind', isPair: false })
    const pair = sub({ id: 'pair', isPair: true })
    expect(findSubForGroup(student([indiv, pair]), 'g1', null, true)?.id).toBe('pair')
    expect(findSubForGroup(student([indiv, pair]), 'g1', null, false)?.id).toBe('ind')
  })
})
