import { clipToElapsed } from './period-delta'

import { afterEach, describe, expect, it, vi } from 'vitest'

// D21: 3-го числа доход за 3 дня делился на ВЕСЬ прошлый месяц и давал
// красное «▼ 90%» — так каждый день месяца, кроме последнего.
const withToday = (iso: string, fn: () => void) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${iso}T12:00:00`))
  try {
    fn()
  } finally {
    vi.useRealTimers()
  }
}

afterEach(() => vi.useRealTimers())

describe('clipToElapsed', () => {
  it('прошлый месяц обрезается по прошедшей доле текущего', () => {
    withToday('2026-07-03', () => {
      const res = clipToElapsed(
        { start: '2026-07-01', end: '2026-07-31' },
        { start: '2026-06-01', end: '2026-06-30' },
      )
      // Прошло 2 дня от начала июля — берём 1-3 июня, а не весь месяц.
      expect(res).toEqual({ start: '2026-06-01', end: '2026-06-03' })
    })
  })

  it('в последний день периода сравнение почти полное', () => {
    withToday('2026-07-31', () => {
      const res = clipToElapsed(
        { start: '2026-07-01', end: '2026-07-31' },
        { start: '2026-06-01', end: '2026-06-30' },
      )
      // Июнь короче — дальше его конца не заходим.
      expect(res).toEqual({ start: '2026-06-01', end: '2026-06-30' })
    })
  })

  it('в первый день периода берём один день прошлого', () => {
    withToday('2026-07-01', () => {
      const res = clipToElapsed(
        { start: '2026-07-01', end: '2026-07-31' },
        { start: '2026-06-01', end: '2026-06-30' },
      )
      expect(res).toEqual({ start: '2026-06-01', end: '2026-06-01' })
    })
  })

  it('без границ («всё время») период не трогаем', () => {
    withToday('2026-07-03', () => {
      const prev = { start: null, end: null }
      expect(clipToElapsed({ start: null, end: null }, prev)).toBe(prev)
    })
  })
})
