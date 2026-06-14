import { todayISO, tomorrowISO } from './date'

import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

describe('tomorrowISO', () => {
  it('на один день больше, чем todayISO', () => {
    expect(dayjs(tomorrowISO()).diff(dayjs(todayISO()), 'day')).toBe(1)
  })

  it('формат YYYY-MM-DD', () => {
    expect(tomorrowISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
