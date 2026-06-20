import { isGroupActiveOn, isGroupExpired } from './group-expiry'

import { describe, expect, it } from 'vitest'

describe('isGroupActiveOn', () => {
  it('бессрочная (null) активна всегда', () => {
    expect(isGroupActiveOn(null, '2026-06-20')).toBe(true)
    expect(isGroupActiveOn(undefined, '2030-01-01')).toBe(true)
  })

  it('активна в день срока (включительно) и до него', () => {
    expect(isGroupActiveOn('2026-06-25', '2026-06-25')).toBe(true)
    expect(isGroupActiveOn('2026-06-25', '2026-06-20')).toBe(true)
  })

  it('не активна после срока', () => {
    expect(isGroupActiveOn('2026-06-25', '2026-06-26')).toBe(false)
    expect(isGroupActiveOn('2026-06-25', '2026-07-01')).toBe(false)
  })
})

describe('isGroupExpired', () => {
  it('бессрочная не истекает', () => {
    expect(isGroupExpired(null, '2030-01-01')).toBe(false)
  })

  it('истекла, когда сегодня позже срока', () => {
    expect(isGroupExpired('2026-06-19', '2026-06-20')).toBe(true)
  })

  it('в день срока ещё не истекла', () => {
    expect(isGroupExpired('2026-06-20', '2026-06-20')).toBe(false)
  })
})
