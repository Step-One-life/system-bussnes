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
  it('отметка по абонементу — иконка ✅, упоминает остаток', () => {
    const r = describeEvent(base)
    expect(r.icon).toBe('✅')
    expect(r.title).toContain('Маша')
    expect(r.detail).toContain('3')
    expect(r.undoable).toBe(true)
  })

  it('отметка платежом — деталь содержит сумму', () => {
    const r = describeEvent({ ...base, summary: { studentName: 'Петя', groupName: 'Старт', billing: 'payment', amount: 1200 } })
    expect(r.detail).toContain('1200')
  })

  it('удаление занятия — не обратимо', () => {
    const r = describeEvent({ ...base, type: 'training_deleted', summary: { groupName: 'Старт' } })
    expect(r.icon).toBe('🗑')
    expect(r.undoable).toBe(false)
  })

  it('отменённое событие помечено флагом', () => {
    const r = describeEvent({ ...base, undoneAt: '2026-06-15T09:00:00.000Z' })
    expect(r.undone).toBe(true)
  })
})
