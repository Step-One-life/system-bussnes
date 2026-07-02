import { formatDayLabel, formatWeekRange } from './calendar-model'

import 'dayjs/locale/ru'
import dayjs from 'dayjs'
import { afterAll, describe, expect, it } from 'vitest'

const initialLocale = dayjs.locale()

afterAll(() => {
  dayjs.locale(initialLocale)
})

// 2026-07-06 — понедельник; подписи следуют за локалью dayjs, не hardcoded 'ru-RU'.
describe('formatDayLabel / formatWeekRange', () => {
  it('ru: день недели и месяцы по-русски', () => {
    dayjs.locale('ru')
    expect(formatDayLabel(new Date(2026, 6, 6))).toBe('пн, 6 июля')
    expect(formatWeekRange(new Date(2026, 6, 6))).toBe('6 июля – 12 июля 2026')
  })

  it('en: те же подписи по-английски', () => {
    dayjs.locale('en')
    expect(formatDayLabel(new Date(2026, 6, 6))).toBe('Mo, 6 July')
    expect(formatWeekRange(new Date(2026, 6, 6))).toBe('6 July – 12 July 2026')
  })
})
