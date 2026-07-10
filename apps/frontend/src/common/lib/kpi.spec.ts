import { computeKPIs, computeWarnings } from './kpi'

import type { Student, Subscription } from 'entities/students/model/types'

import { describe, expect, it, vi } from 'vitest'

// Статусные функции берут i18n только для подписи — тестам важен status.type.
vi.mock('i18next', () => ({ default: { t: (key: string) => key } }))

function localISO(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

/** ISO-дата через n дней от сегодня (локальная полночь — как в getDaysRemaining). */
function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return localISO(d)
}

let seq = 0

function makeSub(over: Partial<Subscription> = {}): Subscription {
  seq += 1
  return {
    id: `sub-${seq}`,
    groupId: 'Группа',
    groupIds: ['Группа'],
    type: '4',
    total: 4,
    remaining: 3,
    createdAt: '2026-01-01',
    expiresAt: daysFromNow(30),
    isActive: true,
    finPaymentId: null,
    sessionDuration: 60,
    timeSlot: 'regular',
    isPair: false,
    isUnlimited: false,
    ...over,
  }
}

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
    createdAt: '2026-01-01',
    ...over,
  }
}

describe('computeKPIs', () => {
  it('считает занятия только текущего месяца (по переданному now)', () => {
    const now = new Date(2026, 5, 15)
    const trainings = [
      { date: '2026-06-01' },
      { date: '2026-06-30' },
      { date: '2026-05-31' },
      { date: '2025-06-10' },
    ]
    expect(computeKPIs([], trainings, now).monthTrainings).toBe(2)
  })

  it('распределяет учеников по худшему статусу: активный / заканчивается / истёк', () => {
    const active = makeStudent({ subscriptions: [makeSub()] })
    const ending = makeStudent({ subscriptions: [makeSub({ remaining: 1 })] })
    const expired = makeStudent({
      subscriptions: [makeSub({ expiresAt: daysFromNow(-1) })],
    })
    const kpis = computeKPIs([active, ending, expired], [], new Date())
    // total — «есть живой абонемент»: активный + заканчивающийся.
    expect(kpis).toMatchObject({ total: 2, ending: 1, expired: 1 })
  })

  it('ученик без групп не считается активным', () => {
    const s = makeStudent({ groups: [], subscriptions: [makeSub()] })
    expect(computeKPIs([s], [], new Date()).total).toBe(0)
  })
})

describe('computeWarnings', () => {
  it('активный абонемент предупреждений не даёт', () => {
    expect(computeWarnings([makeStudent({ subscriptions: [makeSub()] })])).toEqual([])
  })

  it('истёкший по сроку даёт запись с найденным абонементом', () => {
    const sub = makeSub({ expiresAt: daysFromNow(-1) })
    const s = makeStudent({ subscriptions: [sub] })
    const warnings = computeWarnings([s])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].groupId).toBe('Группа')
    expect(warnings[0].sub?.id).toBe(sub.id)
    expect(warnings[0].status.type).toBe('expired')
  })

  it('на каждую проблемную группу — своя запись', () => {
    const s = makeStudent({
      groups: ['A', 'B'],
      subscriptions: [
        makeSub({ groupId: 'A', groupIds: ['A'], remaining: 1 }),
        makeSub({ groupId: 'B', groupIds: ['B'], expiresAt: daysFromNow(-2) }),
      ],
    })
    const types = computeWarnings([s]).map((w) => [w.groupId, w.status.type])
    expect(types).toEqual([
      ['A', 'ending'],
      ['B', 'expired'],
    ])
  })
})
