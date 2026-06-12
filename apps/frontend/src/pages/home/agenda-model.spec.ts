import { describe, expect, it } from 'vitest'

import { minutesOfDay } from './agenda-model'

describe('minutesOfDay', () => {
  it('считает минуты с начала суток', () => {
    expect(minutesOfDay(new Date(2026, 5, 13, 11, 30))).toBe(690)
  })
})
