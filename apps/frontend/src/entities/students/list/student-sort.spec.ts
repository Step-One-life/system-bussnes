import { describe, expect, it } from 'vitest'

import { sortStudents } from './student-sort'

import type { Student, Subscription, VisitRecord } from '../model/types'

let seq = 0
function makeStudent(name: string, over: Partial<Student> = {}): Student {
  seq += 1
  return {
    id: `st-${seq}`,
    name,
    phone: null,
    note: null,
    groups: ['Группа'],
    subscriptions: [],
    visitHistory: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: `sub-${seq}`,
    groupId: 'Группа',
    groupIds: ['Группа'],
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

function visit(date: string): VisitRecord {
  return { date, groupId: 'Группа', trainingId: 't1', billing: 'subscription' }
}

describe('sortStudents', () => {
  it('name: алфавит, исходный массив не мутируется', () => {
    const input = [makeStudent('Яна'), makeStudent('Анна')]
    const res = sortStudents(input, 'name')
    expect(res.map((s) => s.name)).toEqual(['Анна', 'Яна'])
    expect(input.map((s) => s.name)).toEqual(['Яна', 'Анна'])
  })

  it('problems: истёкшие раньше активных, внутри — по имени', () => {
    const ok = makeStudent('Анна', { subscriptions: [sub()] })
    const bad1 = makeStudent('Яков', { subscriptions: [sub({ expiresAt: '2020-01-01' })] })
    const bad2 = makeStudent('Борис', { subscriptions: [sub({ expiresAt: '2020-01-01' })] })
    const res = sortStudents([ok, bad1, bad2], 'problems')
    expect(res.map((s) => s.name)).toEqual(['Борис', 'Яков', 'Анна'])
  })

  it('lastVisit: не был ни разу — первым, затем самый давний визит', () => {
    const recent = makeStudent('Анна', { visitHistory: [visit('2026-07-01')] })
    const old = makeStudent('Пётр', { visitHistory: [visit('2026-05-01')] })
    const never = makeStudent('Соня')
    const res = sortStudents([recent, old, never], 'lastVisit')
    expect(res.map((s) => s.name)).toEqual(['Соня', 'Пётр', 'Анна'])
  })
})
