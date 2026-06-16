import { ONBOARDING_STEP_IDS } from './onboarding-steps'

import type { OnboardingStepId } from './onboarding-steps'

export interface OnboardingState {
  skipped: OnboardingStepId[]
  hidden: boolean
}

export const EMPTY_ONBOARDING_STATE: OnboardingState = { skipped: [], hidden: false }

export const ONBOARDING_STORAGE_PREFIX = 'tk_onboarding_'

export function onboardingStorageKey(userId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`
}

function isStepId(value: unknown): value is OnboardingStepId {
  return typeof value === 'string' && (ONBOARDING_STEP_IDS as string[]).includes(value)
}

// Никогда не бросаем: любое невалидное состояние → безопасный дефолт.
export function parseOnboardingState(raw: string | null): OnboardingState {
  if (!raw) return EMPTY_ONBOARDING_STATE
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_ONBOARDING_STATE
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.skipped) || typeof obj.hidden !== 'boolean') {
      return EMPTY_ONBOARDING_STATE
    }
    return {
      skipped: obj.skipped.filter(isStepId),
      hidden: obj.hidden,
    }
  } catch {
    return EMPTY_ONBOARDING_STATE
  }
}
