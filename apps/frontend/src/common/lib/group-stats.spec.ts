import { groupStats, studentsOfGroup } from './kpi'

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
    remaining: 5,
    createdAt: '2026-06-01',
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

function student(name: string, groups: string[], subs: Subscription[] = []): Student {
  seq += 1
  return {
    id: `st-${seq}`,
    name,
    phone: null,
    note: null,
    groups,
    subscriptions: subs,
    visitHistory: [],
    createdAt: '2026-01-01',
  }
}

describe('studentsOfGroup', () => {
  it('оставляет только учеников этой группы', () => {
    const a = student('Аня', ['Старт'])
    const b = student('Боря', ['Акробатика'])
    const c = student('Вика', ['Старт', 'Акробатика'])
    expect(studentsOfGroup([a, b, c], 'Старт').map((s) => s.name)).toEqual(['Аня', 'Вика'])
  })

  it('пустой список — пустой результат, без падений', () => {
    expect(studentsOfGroup([], 'Старт')).toEqual([])
  })
})

describe('groupStats', () => {
  it('считает всего/активных/заканчивающихся/просроченных по своей группе', () => {
    const active = student('Аня', ['Старт'], [sub()])
    const ending = student('Боря', ['Старт'], [sub({ remaining: 1 })])
    const expired = student('Вика', ['Старт'], [sub({ expiresAt: '2020-01-01' })])
    const other = student('Гриша', ['Акробатика'], [sub({ groupId: 'Акробатика' })])

    expect(groupStats([active, ending, expired, other], 'Старт')).toEqual({
      total: 3,
      active: 1,
      ending: 1,
      expired: 1,
    })
  })

  it('ученик без абонемента считается в total, но ни в один статус', () => {
    const s = student('Дима', ['Старт'])
    expect(groupStats([s], 'Старт')).toEqual({ total: 1, active: 0, ending: 0, expired: 0 })
  })

  it('статус берётся по нужной группе, а не по чужому абонементу', () => {
    // Абонемент есть, но на другую группу — в «Старте» ученик без активного.
    const s = student('Женя', ['Старт', 'Акробатика'], [sub({ groupId: 'Акробатика', groupIds: ['Акробатика'] })])
    expect(groupStats([s], 'Старт').active).toBe(0)
    expect(groupStats([s], 'Акробатика').active).toBe(1)
  })
})
