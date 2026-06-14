import { resolveStartDate } from './renew-date'

import { describe, expect, it } from 'vitest'

describe('resolveStartDate', () => {
  const today = '2026-06-14'
  const tomorrow = '2026-06-15'
  const custom = '2026-07-01'

  it('today → сегодня', () => {
    expect(resolveStartDate('today', today, tomorrow, custom)).toBe(today)
  })

  it('tomorrow → завтра', () => {
    expect(resolveStartDate('tomorrow', today, tomorrow, custom)).toBe(tomorrow)
  })

  it('custom → выбранная дата', () => {
    expect(resolveStartDate('custom', today, tomorrow, custom)).toBe(custom)
  })
})
