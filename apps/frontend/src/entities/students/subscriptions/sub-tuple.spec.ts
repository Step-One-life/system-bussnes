import { subTuple } from './sub-tuple'

import { describe, expect, it } from 'vitest'

const base = { total: 8, sessionDuration: 60, groupIds: ['A'], isPair: false }

describe('subTuple', () => {
  it('групповой абонемент: произвольное число занятий', () => {
    expect(subTuple({ ...base, total: 7 }, false)).toEqual({
      lessonKind: 'group',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 7,
    })
  })

  it('индивидуальный абонемент', () => {
    expect(subTuple({ ...base, total: 12, sessionDuration: 90 }, true)).toEqual({
      lessonKind: 'individual',
      format: 'subscription',
      durationMinutes: 90,
      sessionsCount: 12,
    })
  })

  it('общий абонемент (несколько групп) → shared', () => {
    expect(subTuple({ ...base, groupIds: ['A', 'B'] }, false)).toEqual({
      lessonKind: 'shared',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 8,
    })
  })

  it('парный абонемент → lessonKind pair', () => {
    expect(subTuple({ ...base, total: 6, isPair: true }, true)).toEqual({
      lessonKind: 'pair',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 6,
    })
  })

  it('разовое (total=1) → format single', () => {
    expect(subTuple({ ...base, total: 1 }, false)).toEqual({
      lessonKind: 'group',
      format: 'single',
      durationMinutes: 60,
      sessionsCount: 1,
    })
  })

  it('пустой groupIds → не shared (одиночная группа)', () => {
    expect(subTuple({ ...base, total: 4, groupIds: [] }, false).lessonKind).toBe('group')
  })
})
