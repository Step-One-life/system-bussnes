import { describe, expect, it } from 'vitest'

import { groupByDayAndBatch } from './group-log'

import type { ActivityEntry } from './types'

const ev = (over: Partial<ActivityEntry>): ActivityEntry => ({
  id: Math.random().toString(),
  type: 'attendance_marked',
  batchId: null,
  createdAt: '2026-06-15T08:00:00.000Z',
  undoneAt: null,
  trainingId: 't',
  studentId: 's',
  subscriptionId: null,
  paymentId: null,
  summary: {},
  ...over,
})

describe('groupByDayAndBatch', () => {
  it('разбивает по локальным дням', () => {
    const days = groupByDayAndBatch([
      ev({ createdAt: '2026-06-15T08:00:00.000Z' }),
      ev({ createdAt: '2026-06-14T08:00:00.000Z' }),
    ])
    expect(days).toHaveLength(2)
    expect(days[0].date).toBe('2026-06-15')
  })

  it('события одного batchId внутри дня — в группу', () => {
    const [day] = groupByDayAndBatch([
      ev({ batchId: 'b1', id: '1' }),
      ev({ batchId: 'b1', id: '2' }),
      ev({ batchId: null, id: '3' }),
    ])
    const batchItems = day.items.filter((i) => i.kind === 'batch')
    const singleItems = day.items.filter((i) => i.kind === 'single')
    expect(batchItems).toHaveLength(1)
    expect(batchItems[0].kind === 'batch' && batchItems[0].children).toHaveLength(2)
    expect(singleItems).toHaveLength(1)
  })

  it('пакет из одного события показывается плоско (single)', () => {
    const [day] = groupByDayAndBatch([ev({ batchId: 'solo', id: '1' })])
    expect(day.items[0].kind).toBe('single')
  })
})
