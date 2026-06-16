import { usePricingRules } from 'entities/finance'
import { useGroups } from 'entities/groups'
import { useLocations } from 'entities/locations'
import { useStudents } from 'entities/students'
import { useTrainings } from 'entities/trainings'

import { buildOnboardingSteps, countDone, isChecklistVisible } from './onboarding-steps'
import { useOnboardingState } from './use-onboarding-state'

import type { OnboardingStep, OnboardingStepId } from './onboarding-steps'

export interface UseOnboarding {
  steps: OnboardingStep[]
  visible: boolean
  hasIncomplete: boolean
  doneCount: number
  total: number
  skipStep: (id: OnboardingStepId) => void
  hide: () => void
  reopen: () => void
}

export function useOnboarding(): UseOnboarding {
  const locations = useLocations()
  const groups = useGroups()
  const students = useStudents()
  const trainings = useTrainings()

  const locationsData = locations.data ?? []
  // Дефолтная локация — как в pricing-tab: тариф проверяем по ней (RuleFormModal
  // привязан к locationId). Тариф на не-дефолтной локации — редкий кейс, упрощаем.
  const defaultLocationId = locationsData.length
    ? (locationsData.find((l) => l.isDefault) ?? locationsData[0]).id
    : ''
  const pricing = usePricingRules(defaultLocationId)

  const { skipped, hidden, skipStep, hide, reopen } = useOnboardingState()

  const steps = buildOnboardingSteps(
    {
      hasLocation: locationsData.length > 0,
      hasGroup: (groups.data ?? []).some((g) => !g.isIndividual),
      hasStudent: (students.data ?? []).length > 0,
      hasTraining: (trainings.data ?? []).length > 0,
      hasPricing: (pricing.data ?? []).length > 0,
    },
    skipped,
  )

  // Не мигаем «0/5» на первой загрузке: показываем только после резолва запросов.
  // usePricingRules disabled при пустом locationId, поэтому его загрузку игнорируем.
  const isReady =
    !locations.isLoading &&
    !groups.isLoading &&
    !students.isLoading &&
    !trainings.isLoading &&
    (!defaultLocationId || !pricing.isLoading)

  const visible = isReady && isChecklistVisible(steps, hidden)
  const hasIncomplete = steps.some((s) => s.status !== 'done')

  return {
    steps,
    visible,
    hasIncomplete,
    doneCount: countDone(steps),
    total: steps.length,
    skipStep,
    hide,
    reopen,
  }
}
