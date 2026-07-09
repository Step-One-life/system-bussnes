import { describe, expect, it } from 'vitest'

import { computeLapsed } from './lapsed'

import type { Student, VisitRecord } from 'entities/students/model/types'

const TODAY = '2026-07-03'

let seq = 0
function makeStudent(over: Partial<Student> = {}): Student {
  seq += 1
  return {
    id: `st-${seq}`,
    name: 'Ученик',
    phone: null,
    note: null,
    groups: ['Группа'],
    subscriptions: [],
    visitHistory: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    ...over,
  }
}

function visit(date: string): VisitRecord {
  return { date, groupId: 'Группа', trainingId: 't1', billing: 'subscription' }
}

describe('computeLapsed', () => {
  it('находит ученика без визитов ≥ 14 дней', () => {
    const s = makeStudent({ visitHistory: [visit('2026-06-13')] }) // 20 дней назад
    const res = computeLapsed([s], TODAY)
    expect(res).toHaveLength(1)
    expect(res[0].daysSince).toBe(20)
    expect(res[0].neverVisited).toBe(false)
  })

  it('не трогает ходивших недавно', () => {
    const s = makeStudent({ visitHistory: [visit('2026-06-28')] }) // 5 дней назад
    expect(computeLapsed([s], TODAY)).toHaveLength(0)
  })

  it('точка отсчёта — самый СВЕЖИЙ визит', () => {
    const s = makeStudent({ visitHistory: [visit('2026-05-01'), visit('2026-07-01')] })
    expect(computeLapsed([s], TODAY)).toHaveLength(0)
  })

  it('новичок без визитов получает фору от даты записи', () => {
    const s = makeStudent({ visitHistory: [], createdAt: '2026-06-30T08:00:00.000Z' })
    expect(computeLapsed([s], TODAY)).toHaveLength(0)
  })

  it('старый ученик без единого визита — neverVisited', () => {
    const s = makeStudent({ visitHistory: [], createdAt: '2026-06-03T08:00:00.000Z' })
    const res = computeLapsed([s], TODAY)
    expect(res).toHaveLength(1)
    expect(res[0].daysSince).toBe(30)
    expect(res[0].neverVisited).toBe(true)
  })

  it('без групп не считается (некуда ходить)', () => {
    const s = makeStudent({ groups: [], visitHistory: [visit('2026-05-01')] })
    expect(computeLapsed([s], TODAY)).toHaveLength(0)
  })

  it('граница ровно в threshold дней включается', () => {
    const s = makeStudent({ visitHistory: [visit('2026-06-19')] }) // ровно 14
    expect(computeLapsed([s], TODAY)).toHaveLength(1)
  })

  it('сортирует: дольше всех молчит — первым', () => {
    const a = makeStudent({ visitHistory: [visit('2026-06-13')] }) // 20 дней
    const b = makeStudent({ visitHistory: [visit('2026-06-03')] }) // 30 дней
    const res = computeLapsed([a, b], TODAY)
    expect(res.map((e) => e.daysSince)).toEqual([30, 20])
  })
})
