import { formatDateShort } from 'common/utils/date'

import { describeEvent } from './describe-event'

import type { ActivityEntry } from './types'

import { describe, expect, it } from 'vitest'

const base: ActivityEntry = {
  id: '1',
  type: 'attendance_marked',
  batchId: null,
  createdAt: '2026-06-15T08:00:00.000Z',
  undoneAt: null,
  trainingId: 't1',
  studentId: 's1',
  subscriptionId: null,
  paymentId: null,
  summary: { studentName: 'Маша', groupName: 'Старт', billing: 'subscription', remaining: 3 },
}

describe('describeEvent', () => {
  it('отметка по абонементу — иконка ✅, ключ детали с остатком', () => {
    const r = describeEvent(base)
    expect(r.icon).toBe('✅')
    expect(r.titleText).toContain('Маша')
    expect(r.detailKey).toBe('journal.icon.attendanceSub')
    expect(r.detailParams).toEqual({ count: 3 })
    expect(r.undoable).toBe(true)
  })

  it('отметка платежом — ключ детали с суммой', () => {
    const r = describeEvent({
      ...base,
      summary: { studentName: 'Петя', groupName: 'Старт', billing: 'payment', amount: 1200 },
    })
    expect(r.detailKey).toBe('journal.icon.attendancePay')
    expect(r.detailParams).toEqual({ amount: 1200 })
  })

  it('удаление группового занятия — имя в кавычках, не обратимо', () => {
    const r = describeEvent({ ...base, type: 'training_deleted', summary: { groupName: 'Старт' } })
    expect(r.icon).toBe('🗑')
    expect(r.titleKey).toBe('journal.icon.deleted')
    expect(r.titleParams).toEqual({ name: '«Старт»' })
    expect(r.undoable).toBe(false)
  })

  it('удаление индивидуального — имя ученика + дата/время в детали', () => {
    const r = describeEvent({
      ...base,
      type: 'training_deleted',
      summary: {
        studentName: 'Маша',
        groupName: 'Индивидуальные',
        trainingDate: '2026-06-19',
        trainingTime: '19:00',
      },
    })
    expect(r.titleKey).toBe('journal.icon.deleted')
    expect(r.titleParams).toEqual({ name: 'Маша' })
    expect(r.detailText).toBe(`${formatDateShort('2026-06-19')} · 19:00`)
  })

  it('удаление серии — отдельный ключ + число занятий, не обратимо', () => {
    const r = describeEvent({
      ...base,
      type: 'training_deleted',
      summary: { groupName: 'Старт', sessionsCount: 4 },
    })
    expect(r.titleKey).toBe('journal.icon.deletedSeries')
    expect(r.titleParams).toEqual({ name: '«Старт»' })
    expect(r.detailKey).toBe('journal.icon.deletedSeriesDetail')
    expect(r.detailParams).toEqual({ count: 4 })
    expect(r.undoable).toBe(false)
  })

  it('отменённое событие помечено флагом и не обратимо', () => {
    const r = describeEvent({ ...base, undoneAt: '2026-06-15T09:00:00.000Z' })
    expect(r.undone).toBe(true)
    expect(r.undoable).toBe(false)
  })
})
