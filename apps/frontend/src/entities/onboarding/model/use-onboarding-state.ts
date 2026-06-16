import { useCallback, useRef, useState } from 'react'

import { useAuth } from 'entities/auth/api/use-auth'

import {
  EMPTY_ONBOARDING_STATE,
  onboardingStorageKey,
  parseOnboardingState,
} from './onboarding-storage'

import type { OnboardingStepId } from './onboarding-steps'
import type { OnboardingState } from './onboarding-storage'

function readState(userId: string): OnboardingState {
  try {
    return parseOnboardingState(localStorage.getItem(onboardingStorageKey(userId)))
  } catch {
    return EMPTY_ONBOARDING_STATE
  }
}

function writeState(userId: string, state: OnboardingState): void {
  try {
    localStorage.setItem(onboardingStorageKey(userId), JSON.stringify(state))
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — молча игнорируем.
  }
}

export interface UseOnboardingState {
  skipped: OnboardingStepId[]
  hidden: boolean
  skipStep: (id: OnboardingStepId) => void
  hide: () => void
  reopen: () => void
}

export function useOnboardingState(): UseOnboardingState {
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Ключ per-user: localStorage переживает смену аккаунта (react-query кэши —
  // нет), иначе состояние «протекло» бы между тренерами на одном браузере.
  // Читаем из localStorage синхронно при изменении userId, чтобы не вызывать
  // setState внутри эффекта (нарушает react-hooks/set-state-in-effect).
  const prevUserIdRef = useRef<string | null>(userId)
  const [state, setState] = useState<OnboardingState>(() =>
    userId ? readState(userId) : EMPTY_ONBOARDING_STATE,
  )

  // Если userId изменился (смена аккаунта) — читаем новое состояние синхронно.
  // Это корректно: setState внутри тела рендера только при изменении пропсов/refs
  // (паттерн «derived state from props» из документации React).
  if (prevUserIdRef.current !== userId) {
    prevUserIdRef.current = userId
    const next = userId ? readState(userId) : EMPTY_ONBOARDING_STATE
    setState(next)
  }

  const persist = useCallback(
    (next: OnboardingState) => {
      setState(next)
      if (userId) writeState(userId, next)
    },
    [userId],
  )

  const skipStep = useCallback(
    (id: OnboardingStepId) => {
      setState((prev) => {
        if (prev.skipped.includes(id)) return prev
        const next = { ...prev, skipped: [...prev.skipped, id] }
        if (userId) writeState(userId, next)
        return next
      })
    },
    [userId],
  )

  const hide = useCallback(() => persist({ ...state, hidden: true }), [persist, state])

  // «Первые шаги» из меню профиля: вернуть карточку и снова показать всё несделанное.
  const reopen = useCallback(() => persist({ skipped: [], hidden: false }), [persist])

  return { skipped: state.skipped, hidden: state.hidden, skipStep, hide, reopen }
}
