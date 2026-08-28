import { buildAttentionFeed } from './attention-feed'

import type { UnpaidSub } from './use-unpaid-subs'
import type { WarningEntry } from 'common/lib/kpi'
import type { LapsedEntry } from 'common/lib/lapsed'
import type { Student, Subscription } from 'entities/students/model/types'

import { describe, expect, it } from 'vitest'

function student(name: string): Student {
  return {
    id: `st-${name}`,
    name,
    phone: null,
    note: null,
    groups: ['Старт'],
    subscriptions: [],
    visitHistory: [],
    createdAt: '2026-01-01',
  }
}

const sub = { id: 'sub-1' } as Subscription

const warn = (s: Student, type: 'expired' | 'ending'): WarningEntry => ({
  student: s,
  groupId: 'Старт',
  sub,
  status: { label: type, type },
})
const unpaidOf = (s: Student): UnpaidSub =>
  ({ student: s, sub, isIndividual: false, groupId: 'Старт' }) as UnpaidSub
const lapsedOf = (s: Student, days: number): LapsedEntry => ({
  student: s,
  daysSince: days,
  neverVisited: false,
})

describe('buildAttentionFeed', () => {
  it('три сигнала об одном ученике схлопываются в одну строку', () => {
    const s = student('Аня')
    const feed = buildAttentionFeed([warn(s, 'expired')], [unpaidOf(s)], [lapsedOf(s, 20)])
    expect(feed).toHaveLength(1)
    expect(feed[0].reasons.sort()).toEqual(['expired', 'lapsed', 'unpaid'])
  })

  it('худшая причина определяет порядок и действие', () => {
    const s = student('Аня')
    const feed = buildAttentionFeed([warn(s, 'ending')], [unpaidOf(s)], [])
    expect(feed[0].top).toBe('unpaid') // неоплата серьёзнее «заканчивается»
  })

  it('сортировка: истёкшие → неоплата → заканчивается → пропавшие', () => {
    const a = student('А')
    const b = student('Б')
    const c = student('В')
    const d = student('Г')
    const feed = buildAttentionFeed(
      [warn(a, 'expired'), warn(c, 'ending')],
      [unpaidOf(b)],
      [lapsedOf(d, 30)],
    )
    expect(feed.map((i) => i.name)).toEqual(['А', 'Б', 'В', 'Г'])
  })

  it('среди пропавших первым тот, кто дольше не приходил', () => {
    const a = student('А')
    const b = student('Б')
    const feed = buildAttentionFeed([], [], [lapsedOf(a, 15), lapsedOf(b, 40)])
    expect(feed.map((i) => i.name)).toEqual(['Б', 'А'])
  })

  it('разные ученики остаются разными строками', () => {
    const a = student('А')
    const b = student('Б')
    expect(buildAttentionFeed([warn(a, 'expired')], [unpaidOf(b)], [])).toHaveLength(2)
  })

  it('пустые источники — пустая лента', () => {
    expect(buildAttentionFeed([], [], [])).toEqual([])
  })

  it('несколько предупреждений одного ученика: держим самое серьёзное', () => {
    const s = student('Аня')
    const feed = buildAttentionFeed([warn(s, 'ending'), warn(s, 'expired')], [], [])
    expect(feed).toHaveLength(1)
    expect(feed[0].warning?.status.type).toBe('expired')
  })
})
