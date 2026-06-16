export type OnboardingStepId = 'location' | 'group' | 'student' | 'training' | 'pricing'

export type OnboardingStepStatus = 'done' | 'active' | 'skipped'

export interface OnboardingStep {
  id: OnboardingStepId
  status: OnboardingStepStatus
}

export interface OnboardingFlags {
  hasLocation: boolean
  hasGroup: boolean
  hasStudent: boolean
  hasTraining: boolean
  hasPricing: boolean
}

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = [
  'location',
  'group',
  'student',
  'training',
  'pricing',
]

const FLAG_BY_STEP: Record<OnboardingStepId, keyof OnboardingFlags> = {
  location: 'hasLocation',
  group: 'hasGroup',
  student: 'hasStudent',
  training: 'hasTraining',
  pricing: 'hasPricing',
}

// Статус выводится только из реальных данных + жеста «пропустить»: отдельного
// «прогресса» не храним, чеклист — честное зеркало состояния (см. спеку §4).
export function buildOnboardingSteps(
  flags: OnboardingFlags,
  skipped: OnboardingStepId[],
): OnboardingStep[] {
  return ONBOARDING_STEP_IDS.map((id) => {
    if (flags[FLAG_BY_STEP[id]]) return { id, status: 'done' }
    if (skipped.includes(id)) return { id, status: 'skipped' }
    return { id, status: 'active' }
  })
}

export function isChecklistVisible(steps: OnboardingStep[], hidden: boolean): boolean {
  return !hidden && steps.some((s) => s.status === 'active')
}

export function countDone(steps: OnboardingStep[]): number {
  return steps.filter((s) => s.status === 'done').length
}
