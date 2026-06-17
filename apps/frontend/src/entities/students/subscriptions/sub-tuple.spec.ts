import { subTuple } from './sub-tuple'

import { describe, expect, it } from 'vitest'

describe('subTuple', () => {
  it('групповой абонемент: произвольное число занятий', () => {
    expect(subTuple({ total: 7, sessionDuration: 60, groupIds: ['A'] }, false)).toEqual({
      lessonKind: 'group',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 7,
    })
  })

  it('индивидуальный абонемент', () => {
    expect(subTuple({ total: 12, sessionDuration: 90, groupIds: ['A'] }, true)).toEqual({
      lessonKind: 'individual',
      format: 'subscription',
      durationMinutes: 90,
      sessionsCount: 12,
    })
  })

  it('общий абонемент (несколько групп) → shared', () => {
    expect(subTuple({ total: 8, sessionDuration: 60, groupIds: ['A', 'B'] }, false)).toEqual({
      lessonKind: 'shared',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 8,
    })
  })

  it('разовое (total=1) → format single', () => {
    expect(subTuple({ total: 1, sessionDuration: 60, groupIds: ['A'] }, false)).toEqual({
      lessonKind: 'group',
      format: 'single',
      durationMinutes: 60,
      sessionsCount: 1,
    })
  })

  it('совпадает с пресетом 8 (нет регрессии)', () => {
    const tuple = subTuple({ total: 8, sessionDuration: 60, groupIds: ['A'] }, false)
    expect(tuple).toEqual({
      lessonKind: 'group',
      format: 'subscription',
      durationMinutes: 60,
      sessionsCount: 8,
    })
  })

  it('пустой groupIds → не shared (одиночная группа)', () => {
    expect(subTuple({ total: 4, sessionDuration: 60, groupIds: [] }, false).lessonKind).toBe('group')
  })
})
