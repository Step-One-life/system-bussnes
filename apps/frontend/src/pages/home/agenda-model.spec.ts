import { minutesOfDay, needsMark } from './agenda-model'

import type { AgendaItem } from './agenda-model'
import type { CalendarBlock } from 'entities/trainings'

import { describe, expect, it } from 'vitest'

function item(startMin: number, endMin: number, attendeesCount: number): AgendaItem {
  return {
    startMin,
    endMin,
    typeKey: 'group',
    block: { attendeesCount } as CalendarBlock,
  }
}

describe('minutesOfDay', () => {
  it('считает минуты с начала суток', () => {
    expect(minutesOfDay(new Date(2026, 5, 13, 11, 30))).toBe(690)
  })
})

describe('needsMark', () => {
  it('прошедшее без отметки — требует', () => {
    expect(needsMark(item(600, 660, 0), 700)).toBe(true)
  })
  it('идущее без отметки — требует', () => {
    expect(needsMark(item(600, 660, 0), 630)).toBe(true)
  })
  it('будущее — не требует', () => {
    expect(needsMark(item(600, 660, 0), 599)).toBe(false)
  })
  it('уже отмеченное — не требует', () => {
    expect(needsMark(item(600, 660, 3), 700)).toBe(false)
  })
})
