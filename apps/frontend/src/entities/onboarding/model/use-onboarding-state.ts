import { useSyncExternalStore } from 'react'

import { useAuth } from 'entities/auth/api/use-auth'

import {
  EMPTY_ONBOARDING_STATE,
  onboardingStorageKey,
  parseOnboardingState,
} from './onboarding-storage'

import type { OnboardingStepId } from './onboarding-steps'
import type { OnboardingState } from './onboarding-storage'

// Общий на вкладку внешний стор. И карточка на главной, и пункт меню профиля
// вызывают useOnboardingState; локальный useState давал бы каждому свой экземпляр
// состояния — тогда reopen() из меню не возвращал бы карточку, пока тренер уже на
// главной (HomePage не перемонтируется, его инстанс не перечитал бы localStorage).
// useSyncExternalStore синхронизирует все инстансы: один источник истины на вкладку.
let currentUserId: string | null = null
let state: OnboardingState = EMPTY_ONBOARDING_STATE
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): OnboardingState {
  return state
}

function readFromStorage(userId: string): OnboardingState {
  try {
    return parseOnboardingState(localStorage.getItem(onboardingStorageKey(userId)))
  } catch {
    return EMPTY_ONBOARDING_STATE
  }
}

function writeToStorage(userId: string, next: OnboardingState): void {
  try {
    localStorage.setItem(onboardingStorageKey(userId), JSON.stringify(next))
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — молча игнорируем.
  }
}

// Привести стор к текущему пользователю. Вызывается синхронно при рендере хука
// (до первого снимка — без мигания «0/5»). Эмитить здесь нельзя (обновление
// других компонентов во время рендера), но это и не нужно: смена userId = смена
// аккаунта = полный ремаунт приложения, инстансы перечитают стор при ре-рендере.
function ensureUser(userId: string | null): void {
  if (userId === currentUserId) return
  currentUserId = userId
  state = userId ? readFromStorage(userId) : EMPTY_ONBOARDING_STATE
}

function update(next: OnboardingState): void {
  state = next
  if (currentUserId) writeToStorage(currentUserId, next)
  emit()
}

// Сбросить общий стор при смене сессии (логин/логаут/регистрация) — наравне с
// кэшами react-query/locations/group-map в auth-provider. Без этого данные
// ушедшего тренера остаются в памяти синглтона до следующего ensureUser.
export function resetOnboardingStore(): void {
  currentUserId = null
  state = EMPTY_ONBOARDING_STATE
  emit()
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

  ensureUser(userId)
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const skipStep = (id: OnboardingStepId) => {
    if (snapshot.skipped.includes(id)) return
    update({ ...snapshot, skipped: [...snapshot.skipped, id] })
  }

  const hide = () => update({ ...snapshot, hidden: true })

  // «Первые шаги» из меню профиля: вернуть карточку и снова показать несделанное.
  const reopen = () => update({ skipped: [], hidden: false })

  return { skipped: snapshot.skipped, hidden: snapshot.hidden, skipStep, hide, reopen }
}
