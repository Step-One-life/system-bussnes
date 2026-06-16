import {
  EMPTY_ONBOARDING_STATE,
  onboardingStorageKey,
  parseOnboardingState,
} from './onboarding-storage'

import { describe, expect, it } from 'vitest'

describe('onboardingStorageKey', () => {
  it('строит per-user ключ с префиксом tk_', () => {
    expect(onboardingStorageKey('u1')).toBe('tk_onboarding_u1')
  })
})

describe('parseOnboardingState', () => {
  it('null → дефолт', () => {
    expect(parseOnboardingState(null)).toEqual(EMPTY_ONBOARDING_STATE)
  })

  it('битый JSON → дефолт', () => {
    expect(parseOnboardingState('{not json')).toEqual(EMPTY_ONBOARDING_STATE)
  })

  it('валидное состояние читается как есть', () => {
    const raw = JSON.stringify({ skipped: ['group'], hidden: true })
    expect(parseOnboardingState(raw)).toEqual({ skipped: ['group'], hidden: true })
  })

  it('отбрасывает неизвестные id шагов', () => {
    const raw = JSON.stringify({ skipped: ['group', 'bogus'], hidden: false })
    expect(parseOnboardingState(raw)).toEqual({ skipped: ['group'], hidden: false })
  })

  it('кривые типы полей → дефолт', () => {
    const raw = JSON.stringify({ skipped: 'group', hidden: 'yes' })
    expect(parseOnboardingState(raw)).toEqual(EMPTY_ONBOARDING_STATE)
  })
})
