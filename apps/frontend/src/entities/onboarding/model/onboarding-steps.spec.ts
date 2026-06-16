import {
  buildOnboardingSteps,
  countDone,
  isChecklistVisible,
  ONBOARDING_STEP_IDS,
} from './onboarding-steps'

import type { OnboardingFlags } from './onboarding-steps'

import { describe, expect, it } from 'vitest'


const allFalse: OnboardingFlags = {
  hasLocation: false,
  hasGroup: false,
  hasStudent: false,
  hasTraining: false,
  hasPricing: false,
}

describe('buildOnboardingSteps', () => {
  it('возвращает пять шагов в фиксированном порядке', () => {
    const steps = buildOnboardingSteps(allFalse, [])
    expect(steps.map((s) => s.id)).toEqual(ONBOARDING_STEP_IDS)
  })

  it('шаг done, если соответствующий флаг истинный', () => {
    const steps = buildOnboardingSteps({ ...allFalse, hasLocation: true }, [])
    expect(steps.find((s) => s.id === 'location')?.status).toBe('done')
  })

  it('шаг active, если данных нет и он не пропущен', () => {
    const steps = buildOnboardingSteps(allFalse, [])
    expect(steps.find((s) => s.id === 'group')?.status).toBe('active')
  })

  it('шаг skipped, если он в списке пропущенных и данных нет', () => {
    const steps = buildOnboardingSteps(allFalse, ['group'])
    expect(steps.find((s) => s.id === 'group')?.status).toBe('skipped')
  })

  it('данные побеждают пропуск: done важнее skipped', () => {
    const steps = buildOnboardingSteps({ ...allFalse, hasGroup: true }, ['group'])
    expect(steps.find((s) => s.id === 'group')?.status).toBe('done')
  })
})

describe('isChecklistVisible', () => {
  it('виден, если есть хотя бы один active и не скрыт', () => {
    const steps = buildOnboardingSteps(allFalse, [])
    expect(isChecklistVisible(steps, false)).toBe(true)
  })

  it('скрыт флагом hidden', () => {
    const steps = buildOnboardingSteps(allFalse, [])
    expect(isChecklistVisible(steps, true)).toBe(false)
  })

  it('не виден, когда все шаги done', () => {
    const steps = buildOnboardingSteps(
      { hasLocation: true, hasGroup: true, hasStudent: true, hasTraining: true, hasPricing: true },
      [],
    )
    expect(isChecklistVisible(steps, false)).toBe(false)
  })

  it('не виден, когда оставшиеся шаги пропущены (нет active)', () => {
    const steps = buildOnboardingSteps(allFalse, [...ONBOARDING_STEP_IDS])
    expect(isChecklistVisible(steps, false)).toBe(false)
  })
})

describe('countDone', () => {
  it('считает только done', () => {
    const steps = buildOnboardingSteps(
      { ...allFalse, hasLocation: true, hasStudent: true },
      ['group'],
    )
    expect(countDone(steps)).toBe(2)
  })
})
