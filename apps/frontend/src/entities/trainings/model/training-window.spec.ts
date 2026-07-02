import { daysBetweenISO } from 'common/utils/date'

import { trainingsWindow, WINDOW_FUTURE_DAYS, WINDOW_PAST_DAYS } from './training-window'

import { describe, expect, it } from 'vitest'

describe('trainingsWindow', () => {
  it('отступает от «сегодня» ровно на границы окна', () => {
    const { from, to } = trainingsWindow('2026-07-02')
    expect(daysBetweenISO(from, '2026-07-02')).toBe(WINDOW_PAST_DAYS)
    expect(daysBetweenISO('2026-07-02', to)).toBe(WINDOW_FUTURE_DAYS)
  })

  it('считает конкретные даты без UTC-сдвигов', () => {
    expect(trainingsWindow('2026-07-02')).toEqual({ from: '2026-04-03', to: '2026-12-29' })
  })

  it('переживает границу года в обе стороны', () => {
    expect(trainingsWindow('2026-01-15')).toEqual({ from: '2025-10-17', to: '2026-07-14' })
    expect(trainingsWindow('2025-12-31')).toEqual({ from: '2025-10-02', to: '2026-06-29' })
  })
})
