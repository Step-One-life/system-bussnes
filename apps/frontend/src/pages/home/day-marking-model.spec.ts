import {
  closeDaySummary,
  defaultGroupChecks,
  defaultIndChecks,
  indKey,
} from './day-marking-model'

import { describe, expect, it } from 'vitest'

const member = (id: string) => ({ id }) as { id: string }

describe('defaultGroupChecks', () => {
  it('неотмеченное занятие — предотмечен весь состав, кроме гейтнутых', () => {
    const res = defaultGroupChecks(
      { existing: null },
      [member('a'), member('b'), member('c')],
      (s) => s.id !== 'b',
    )
    expect(res).toEqual(new Set(['a', 'c']))
  })
  it('пустое занятие (запись есть, отметок нет) — тоже весь состав', () => {
    const res = defaultGroupChecks({ existing: { attendees: [] } }, [member('a')], () => true)
    expect(res).toEqual(new Set(['a']))
  })
  it('уже отмеченное — фактические отметки, состав не доставляется', () => {
    const res = defaultGroupChecks(
      { existing: { attendees: ['a'] } },
      [member('a'), member('b')],
      () => true,
    )
    expect(res).toEqual(new Set(['a']))
  })
})

describe('defaultIndChecks', () => {
  it('плановый с абонементом — пришёл; гейтнутый — нет; отмеченный — как есть', () => {
    const slots = [
      { trainingId: 't1', studentId: 's1', originalPresent: false },
      { trainingId: 't2', studentId: 's2', originalPresent: false },
      { trainingId: 't3', studentId: 's3', originalPresent: true },
    ]
    const res = defaultIndChecks(slots, (slot) => slot.studentId !== 's2')
    expect(res).toEqual({
      [indKey('t1', 's1')]: true,
      [indKey('t2', 's2')]: false,
      [indKey('t3', 's3')]: true,
    })
  })
  it('парное: два studentId на один trainingId — разные ключи, независимые значения', () => {
    const slots = [
      { trainingId: 't1', studentId: 's1', originalPresent: false },
      { trainingId: 't1', studentId: 's2', originalPresent: false },
    ]
    const res = defaultIndChecks(slots, (slot) => slot.studentId === 's1')
    expect(res).toEqual({
      [indKey('t1', 's1')]: true,
      [indKey('t1', 's2')]: false,
    })
  })
})

describe('closeDaySummary', () => {
  it('считает только выбранные строки с кем-то к отметке', () => {
    const rows = [
      { key: 'g1', alreadyMarked: false, willMark: 5 },
      { key: 'g2', alreadyMarked: true, willMark: 0 },
      { key: 'i1', alreadyMarked: false, willMark: 1 },
      { key: 'i2', alreadyMarked: false, willMark: 1 },
    ]
    expect(closeDaySummary(rows, new Set(['g1', 'g2', 'i1']))).toEqual({
      trainings: 2,
      students: 6,
    })
  })
})
