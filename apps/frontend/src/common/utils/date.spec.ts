import { daysBetweenISO, shiftISODate, todayISO, tomorrowISO } from './date'

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

describe('shiftISODate', () => {
  it('сдвигает вперёд через границу месяца', () => {
    expect(shiftISODate('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('сдвигает назад через границу года', () => {
    expect(shiftISODate('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('сдвиг на 0 — без изменений', () => {
    expect(shiftISODate('2026-09-07', 0)).toBe('2026-09-07')
  })
})

describe('daysBetweenISO', () => {
  it('положительная разница (перенос вперёд)', () => {
    expect(daysBetweenISO('2026-09-07', '2026-09-08')).toBe(1)
  })

  it('отрицательная разница (перенос назад)', () => {
    expect(daysBetweenISO('2026-09-07', '2026-09-06')).toBe(-1)
  })

  it('одинаковые даты — 0', () => {
    expect(daysBetweenISO('2026-09-07', '2026-09-07')).toBe(0)
  })

  it('через границу месяца', () => {
    expect(daysBetweenISO('2026-09-30', '2026-10-02')).toBe(2)
  })
})
