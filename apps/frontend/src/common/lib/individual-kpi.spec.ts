import { computeIndividualKPIs, computeIndividualWarnings } from './kpi'

import type { Student, Subscription } from 'entities/students/model/types'

import { describe, expect, it } from 'vitest'

const IND = ['Индивидуальные']
const NOW = new Date(2026, 7, 27) // 27 августа 2026, четверг

let seq = 0
function sub(over: Partial<Subscription> = {}): Subscription {
  seq += 1
  return {
    id: `sub-${seq}`,
    groupId: 'Индивидуальные',
    groupIds: ['Индивидуальные'],
    type: 'sub',
    total: 8,
    remaining: 5,
    createdAt: '2026-08-01',
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

const tr = (date: string, groupId = 'Индивидуальные') => ({ date, groupId })

describe('computeIndividualKPIs', () => {
  it('пустой список индив-групп — нули без падений', () => {
    expect(computeIndividualKPIs([student('А', ['Старт'])], [tr('2026-08-20')], [], NOW)).toEqual({
      clients: 0,
      monthSessions: 0,
      weekSessions: 0,
      expiring: 0,
    })
  })

  it('считает клиентов только индивидуальных групп', () => {
    const a = student('Аня', ['Индивидуальные'], [sub()])
    const b = student('Боря', ['Старт'])
    expect(computeIndividualKPIs([a, b], [], IND, NOW).clients).toBe(1)
  })

  it('сессии за месяц и за неделю считаются от переданной даты', () => {
    const k = computeIndividualKPIs(
      [student('Аня', IND, [sub()])],
      [tr('2026-08-26'), tr('2026-08-05'), tr('2026-07-30'), tr('2026-08-20', 'Старт')],
      IND,
      NOW,
    )
    expect(k.monthSessions).toBe(2) // 26 и 5 августа; июльская и чужая группа не в счёт
    expect(k.weekSessions).toBe(1) // неделя началась в понедельник 24 августа
  })

  it('expiring считает учеников с истёкшим или заканчивающимся абонементом', () => {
    const ok = student('Аня', IND, [sub()])
    const expired = student('Боря', IND, [sub({ expiresAt: '2020-01-01' })])
    const ending = student('Вика', IND, [sub({ remaining: 1 })])
    expect(computeIndividualKPIs([ok, expired, ending], [], IND, NOW).expiring).toBe(2)
  })
})

describe('computeIndividualWarnings', () => {
  it('возвращает по строке на проблемную пару ученик×индив-группа', () => {
    const expired = student('Боря', IND, [sub({ expiresAt: '2020-01-01' })])
    const ok = student('Аня', IND, [sub()])
    const other = student('Гриша', ['Старт'], [sub({ groupId: 'Старт', groupIds: ['Старт'], expiresAt: '2020-01-01' })])
    const res = computeIndividualWarnings([expired, ok, other], IND)
    expect(res).toHaveLength(1)
    expect(res[0].student.name).toBe('Боря')
    expect(res[0].status.type).toBe('expired')
  })
})
