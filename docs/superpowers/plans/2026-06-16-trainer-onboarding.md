# Trainer Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать тренеру после регистрации мягкий проводник «с чего начать» — карточку-чеклист «Первые шаги» на главной (B) и CTA-кнопки в ключевых пустых экранах (C), не блокируя и не навязывая.

**Architecture:** Новый фронтовый модуль `entities/onboarding/` с чистой логикой шагов (vitest), localStorage-хуком состояния (per-user) и композитным хуком, выводящим статусы шагов из реальных серверных данных через существующие react-query хуки. Карточка рендерится на главной и сама прячется, когда показывать нечего. Бэкенд **не меняется**. Часть C — добавление `action`-кнопок в существующие `EmptyState`.

**Tech Stack:** React + Vite + antd + react-query + react-i18next + i18next, vitest. Конвенции: без точек с запятой, одинарные кавычки, отступ 2 пробела, UI-тексты только через `t('...')`, path-алиасы (`common`, `entities`, `pages`, `app`).

**Ветка:** `feat/trainer-onboarding` (уже создана, спека в ней закоммичена). Все задачи — в этой ветке.

---

## Источники истины (по спеке и разведке кода)

- Спека: `docs/superpowers/specs/2026-06-16-trainer-onboarding-design.md`
- `EmptyState`: `apps/frontend/src/common/ui/empty-state/empty-state.tsx` — `interface EmptyStateProps { icon?: ReactNode; title: string; text?: string; action?: ReactNode }`, экспорт из `common/ui`. Рабочий пример CTA — `apps/frontend/src/pages/home/today-agenda.tsx:49-60`.
- Маркер индивидуальной группы-контейнера: `Group.isIndividual === true` (`apps/frontend/src/entities/groups/model/types.ts:11`). «Есть группа» для онбординга = есть группа с `isIndividual === false`.
- `usePricingRules(locationId: string)` (`apps/frontend/src/entities/finance/api/use-finance.ts:97`) требует непустой `locationId` (`enabled: !!locationId`); экспортируется из `entities/finance`.
- Дефолтная локация выбирается как в `pricing-tab.tsx:34-37`: `find(l => l.isDefault) ?? locations[0]`.
- Текущий userId: `useAuth().user?.id` (`entities/auth/api/use-auth.ts`, тип `AuthUser.id: string`).
- localStorage-конвенция: префикс `tk_`, безопасное чтение/запись через try/catch (`common/services/api/token-storage.ts`, `app/providers/theme-provider.tsx`). **Важно:** localStorage переживает смену аккаунта (кэши react-query чистятся, localStorage — нет) → ключ per-user.
- Тесты: `*.spec.ts`, co-located рядом с исходником, `import { describe, expect, it } from 'vitest'` (пример — `entities/activity-log/model/group-log.spec.ts`). Запуск: `npm test -w apps/frontend` (= `vitest run`), фильтр по файлу — добавить путь в конце.
- Плюрализация RU: ключи `key` / `key_few` / `key_many` + `t(key, { count })` (пример — `journal.batchMarks*`, `home.trainingsCount*`). EN: `key` / `key_other`.
- Роуты (`apps/frontend/src/app/routes.tsx`): `/` (Home), `/trainings`, `/people/students`, `/people/groups`, `/people/individual`, `/finance`, `/settings`, `/journal`.

---

## File Structure

**Новый модуль `apps/frontend/src/entities/onboarding/`:**

| Файл | Ответственность |
|------|-----------------|
| `model/onboarding-steps.ts` | Чистые типы + `buildOnboardingSteps`, `isChecklistVisible`, `countDone`, `ONBOARDING_STEP_IDS`. Без React/react-query. |
| `model/onboarding-steps.spec.ts` | vitest для чистой логики выше. |
| `model/onboarding-storage.ts` | Чистые: `OnboardingState`, `EMPTY_ONBOARDING_STATE`, `onboardingStorageKey(userId)`, `parseOnboardingState(raw)`. Без обращения к `localStorage`. |
| `model/onboarding-storage.spec.ts` | vitest для парсинга/дефолтов. |
| `model/use-onboarding-state.ts` | React-хук: чтение/запись localStorage по per-user ключу; `{ skipped, hidden, skipStep, hide, reopen }`. |
| `model/use-onboarding.ts` | Композитный хук: дата-хуки → флаги → `buildOnboardingSteps`; видимость, прогресс, действия. |
| `ui/onboarding-checklist.tsx` | Карточка на главной (рендер шагов, прогресс, «Пропустить», «Скрыть», навигация по тапу). |
| `index.ts` | Публичный API модуля. |

**Изменяемые файлы:**

| Файл | Изменение |
|------|-----------|
| `apps/frontend/src/pages/home/home-page.tsx` | Рендер `<OnboardingChecklist />` над `home-cols`. |
| `apps/frontend/src/pages/finance/use-finance-page.ts` | Начальная вкладка из `location.state.financeTab`. |
| `apps/frontend/src/app/layout/profile-menu.tsx` | Пункт «Первые шаги» (условно). |
| `apps/frontend/src/pages/groups/groups-page.tsx` | Состояние создания ученика + `onAddStudent` в `GroupDetail`. |
| `apps/frontend/src/entities/groups/details/group-detail.tsx` | Проп `onAddStudent` + CTA в пустом экране «нет учеников». |
| `apps/frontend/src/pages/trainings/trainings-page.tsx` | CTA в пустом экране. |
| `apps/frontend/src/pages/individual/individual-page.tsx` | CTA в пустом экране «нет клиентов». |
| `apps/frontend/src/entities/finance/pricing/pricing-tab.tsx` | Проп `onAddLocation` + CTA в «нет локаций». |
| `apps/frontend/src/pages/finance/finance-page.tsx` | Передача `onAddLocation` в `PricingTab`. |
| `apps/frontend/src/locales/ru/translation.json` | Раздел `onboarding.*`, `nav.onboarding`. |
| `apps/frontend/src/locales/en/translation.json` | То же на английском. |

---

## Task 1: Чистая логика шагов онбординга

**Files:**
- Create: `apps/frontend/src/entities/onboarding/model/onboarding-steps.ts`
- Test: `apps/frontend/src/entities/onboarding/model/onboarding-steps.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/frontend/src/entities/onboarding/model/onboarding-steps.spec.ts`:

```ts
import {
  ONBOARDING_STEP_IDS,
  buildOnboardingSteps,
  countDone,
  isChecklistVisible,
} from './onboarding-steps'

import type { OnboardingFlags } from './onboarding-steps'

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
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -w apps/frontend -- src/entities/onboarding/model/onboarding-steps.spec.ts`
Expected: FAIL (модуль `./onboarding-steps` не найден).

- [ ] **Step 3: Реализовать чистую логику**

Создать `apps/frontend/src/entities/onboarding/model/onboarding-steps.ts`:

```ts
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
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -w apps/frontend -- src/entities/onboarding/model/onboarding-steps.spec.ts`
Expected: PASS (все блоки зелёные).

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/entities/onboarding/model/onboarding-steps.ts apps/frontend/src/entities/onboarding/model/onboarding-steps.spec.ts
git commit -m "feat(onboarding): чистая логика шагов + тесты"
```

---

## Task 2: Парсинг состояния (localStorage) — чистая часть

**Files:**
- Create: `apps/frontend/src/entities/onboarding/model/onboarding-storage.ts`
- Test: `apps/frontend/src/entities/onboarding/model/onboarding-storage.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/frontend/src/entities/onboarding/model/onboarding-storage.spec.ts`:

```ts
import {
  EMPTY_ONBOARDING_STATE,
  onboardingStorageKey,
  parseOnboardingState,
} from './onboarding-storage'

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
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -w apps/frontend -- src/entities/onboarding/model/onboarding-storage.spec.ts`
Expected: FAIL (модуль `./onboarding-storage` не найден).

- [ ] **Step 3: Реализовать парсинг**

Создать `apps/frontend/src/entities/onboarding/model/onboarding-storage.ts`:

```ts
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
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -w apps/frontend -- src/entities/onboarding/model/onboarding-storage.spec.ts`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/entities/onboarding/model/onboarding-storage.ts apps/frontend/src/entities/onboarding/model/onboarding-storage.spec.ts
git commit -m "feat(onboarding): парсинг состояния localStorage + тесты"
```

---

## Task 3: Хук состояния (localStorage, per-user)

**Files:**
- Create: `apps/frontend/src/entities/onboarding/model/use-onboarding-state.ts`

- [ ] **Step 1: Реализовать хук**

Создать `apps/frontend/src/entities/onboarding/model/use-onboarding-state.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from 'entities/auth/api/use-auth'

import {
  EMPTY_ONBOARDING_STATE,
  onboardingStorageKey,
  parseOnboardingState,
} from './onboarding-storage'

import type { OnboardingState } from './onboarding-storage'
import type { OnboardingStepId } from './onboarding-steps'

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
  const [state, setState] = useState<OnboardingState>(EMPTY_ONBOARDING_STATE)

  // Ключ per-user: localStorage переживает смену аккаунта (react-query кэши —
  // нет), иначе состояние «протекло» бы между тренерами на одном браузере.
  useEffect(() => {
    setState(userId ? readState(userId) : EMPTY_ONBOARDING_STATE)
  }, [userId])

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
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка (tsc + vite), без ошибок типов.

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/src/entities/onboarding/model/use-onboarding-state.ts
git commit -m "feat(onboarding): per-user localStorage хук состояния"
```

---

## Task 4: Композитный хук (данные → шаги → видимость)

**Files:**
- Create: `apps/frontend/src/entities/onboarding/model/use-onboarding.ts`

- [ ] **Step 1: Реализовать композитный хук**

Создать `apps/frontend/src/entities/onboarding/model/use-onboarding.ts`:

```ts
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
```

- [ ] **Step 2: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка. Если tsc ругается, что `useLocations`/`useGroups`/`useStudents`/`useTrainings`/`usePricingRules` не экспортируются из соответствующего барреля — проверить барель `entities/<name>/index.ts` и импортировать из конкретного `api/`-файла (пути: `entities/locations/api/use-locations`, `entities/groups/api/use-groups`, `entities/students/api/use-students`, `entities/trainings/api/use-trainings`, `entities/finance/api/use-finance`).

- [ ] **Step 3: Коммит**

```bash
git add apps/frontend/src/entities/onboarding/model/use-onboarding.ts
git commit -m "feat(onboarding): композитный хук статусов и видимости"
```

---

## Task 5: UI-карточка + барель + i18n

**Files:**
- Create: `apps/frontend/src/entities/onboarding/ui/onboarding-checklist.tsx`
- Create: `apps/frontend/src/entities/onboarding/index.ts`
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Добавить i18n-ключи (RU)**

В `apps/frontend/src/locales/ru/translation.json` в блок `nav` (после `"journal": "Журнал"`) добавить ключ `onboarding` (не забыть запятую после `"journal"`):

```json
    "journal": "Журнал",
    "onboarding": "Первые шаги"
```

И добавить новый top-level раздел `onboarding` (например, рядом с `home`/`journal` — порядок ключей в JSON не важен; следить за валидностью запятых):

```json
  "onboarding": {
    "title": "Первые шаги",
    "hide": "Скрыть",
    "skip": "Пропустить",
    "stepsLeft": "Остался {{count}} шаг",
    "stepsLeft_few": "Осталось {{count}} шага",
    "stepsLeft_many": "Осталось {{count}} шагов",
    "steps": {
      "location": { "title": "Добавить локацию", "desc": "Где проходят занятия" },
      "group": { "title": "Создать группу", "desc": "Или пропустите, если работаете индивидуально" },
      "student": { "title": "Добавить ученика", "desc": "Первый клиент в базе" },
      "training": { "title": "Записать первое занятие", "desc": "Групповое, индивидуальное, онлайн или парное" },
      "pricing": { "title": "Настроить тариф", "desc": "Деньги посчитаются сами" }
    }
  }
```

- [ ] **Step 2: Добавить i18n-ключи (EN)**

В `apps/frontend/src/locales/en/translation.json` в блок `nav` добавить:

```json
    "journal": "Journal",
    "onboarding": "First steps"
```

И top-level раздел:

```json
  "onboarding": {
    "title": "First steps",
    "hide": "Hide",
    "skip": "Skip",
    "stepsLeft": "{{count}} step left",
    "stepsLeft_other": "{{count}} steps left",
    "steps": {
      "location": { "title": "Add a location", "desc": "Where sessions take place" },
      "group": { "title": "Create a group", "desc": "Or skip if you train one-on-one" },
      "student": { "title": "Add a student", "desc": "Your first client" },
      "training": { "title": "Record your first session", "desc": "Group, individual, online or pair" },
      "pricing": { "title": "Set up pricing", "desc": "Money is calculated automatically" }
    }
  }
```

- [ ] **Step 3: Реализовать карточку**

Создать `apps/frontend/src/entities/onboarding/ui/onboarding-checklist.tsx`:

```tsx
import { Button, Card, Progress } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useOnboarding } from '../model/use-onboarding'

import type { OnboardingStepId } from '../model/onboarding-steps'

// Тап по шагу ведёт в существующий раздел, где пустой экран с CTA (часть C)
// доводит до формы — отдельных «онбординг-экранов» не плодим (спека §6).
const STEP_NAV: Record<OnboardingStepId, { path: string; state?: { financeTab: string } }> = {
  location: { path: '/finance', state: { financeTab: 'locations' } },
  group: { path: '/people/groups' },
  student: { path: '/people/students' },
  training: { path: '/trainings' },
  pricing: { path: '/finance', state: { financeTab: 'pricing' } },
}

export function OnboardingChecklist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { steps, visible, doneCount, total, skipStep, hide } = useOnboarding()

  if (!visible) return null

  const hasLocation = steps.find((s) => s.id === 'location')?.status === 'done'

  const go = (id: OnboardingStepId) => {
    // Тариф требует локацию (RuleFormModal требует locationId) — без неё ведём к локации.
    const target = id === 'pricing' && !hasLocation ? STEP_NAV.location : STEP_NAV[id]
    navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  return (
    <Card
      className="onboarding-card"
      style={{ marginBottom: 'var(--sp-6)' }}
      title={t('onboarding.title')}
      extra={
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={hide}
          aria-label={t('onboarding.hide')}
        />
      }
    >
      <Progress percent={Math.round((doneCount / total) * 100)} showInfo={false} />

      <div style={{ marginTop: 'var(--sp-4)' }}>
        {steps.map((step) => {
          const done = step.status === 'done'
          const skipped = step.status === 'skipped'
          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-2) 0',
                opacity: skipped ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: done ? 'var(--tk-ok, #52c41a)' : 'transparent',
                  border: done ? 'none' : '2px solid var(--tk-border, #d9d9d9)',
                  color: '#fff',
                  fontSize: 11,
                }}
              >
                {done ? <CheckOutlined /> : null}
              </span>

              <button
                type="button"
                onClick={() => go(step.id)}
                disabled={done}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: done ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                <div style={{ textDecoration: done ? 'line-through' : 'none' }}>
                  {t(`onboarding.steps.${step.id}.title`)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tk-text-secondary, #888)' }}>
                  {t(`onboarding.steps.${step.id}.desc`)}
                </div>
              </button>

              {step.status === 'active' && (
                <button
                  type="button"
                  onClick={() => skipStep(step.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--tk-text-secondary, #888)',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {t('onboarding.skip')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 'var(--sp-3)', fontSize: 12, color: 'var(--tk-text-secondary, #888)' }}>
        {t('onboarding.stepsLeft', { count: total - doneCount })}
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Создать барель модуля**

Создать `apps/frontend/src/entities/onboarding/index.ts`:

```ts
export { OnboardingChecklist } from './ui/onboarding-checklist'
export { useOnboarding } from './model/use-onboarding'
export { useOnboardingState } from './model/use-onboarding-state'
export * from './model/onboarding-steps'
```

- [ ] **Step 5: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка. JSON-локали валидны (если vite/tsc не падает на импорте translation.json — JSON корректен).

- [ ] **Step 6: Коммит**

```bash
git add apps/frontend/src/entities/onboarding/ui/onboarding-checklist.tsx apps/frontend/src/entities/onboarding/index.ts apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(onboarding): карточка-чеклист, барель модуля, i18n"
```

---

## Task 6: Рендер на главной + навигация на вкладку финансов

**Files:**
- Modify: `apps/frontend/src/pages/home/home-page.tsx`
- Modify: `apps/frontend/src/pages/finance/use-finance-page.ts`

- [ ] **Step 1: Импортировать карточку на главной**

В `apps/frontend/src/pages/home/home-page.tsx` добавить импорт (рядом с другими импортами из `entities/...`):

```tsx
import { OnboardingChecklist } from 'entities/onboarding'
```

- [ ] **Step 2: Вставить карточку над `home-cols`**

В `apps/frontend/src/pages/home/home-page.tsx` найти блок (строки ~262-269):

```tsx
      {page.kpis && (
        // Проблемные показатели первыми: тренер сперва видит, где беда.
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <KpiStrip kpis={page.kpis} onSelect={page.setKpiType} />
        </div>
      )}

      <div className="home-cols">
```

и вставить `<OnboardingChecklist />` между блоком KPI и `home-cols`:

```tsx
      {page.kpis && (
        // Проблемные показатели первыми: тренер сперва видит, где беда.
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <KpiStrip kpis={page.kpis} onSelect={page.setKpiType} />
        </div>
      )}

      <OnboardingChecklist />

      <div className="home-cols">
```

(Карточка сама прячется, когда показывать нечего — условие в `useOnboarding().visible`.)

- [ ] **Step 3: Дать вкладке финансов читать начальную вкладку из навигации**

Заменить `apps/frontend/src/pages/finance/use-finance-page.ts` целиком на:

```ts
import { useState } from 'react'

import { useLocation } from 'react-router-dom'

export type FinanceTab = 'records' | 'stats' | 'pricing' | 'locations'

export function useFinancePage() {
  const location = useLocation()
  const initial = (location.state as { financeTab?: FinanceTab } | null)?.financeTab ?? 'records'
  const [tab, setTab] = useState<FinanceTab>(initial)
  return { tab, setTab }
}
```

- [ ] **Step 4: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/pages/home/home-page.tsx apps/frontend/src/pages/finance/use-finance-page.ts
git commit -m "feat(onboarding): карточка на главной + переход на вкладку финансов из шага"
```

---

## Task 7: Пункт «Первые шаги» в меню профиля

**Files:**
- Modify: `apps/frontend/src/app/layout/profile-menu.tsx`

- [ ] **Step 1: Подключить хук и иконку**

В `apps/frontend/src/app/layout/profile-menu.tsx`:

В импорте иконок добавить `RocketOutlined`:

```tsx
import { BulbOutlined, HistoryOutlined, LogoutOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons'
```

Добавить импорт хука (рядом с другими `entities/...`):

```tsx
import { useOnboarding } from 'entities/onboarding'
```

В теле компонента (после `const navigate = useNavigate()`):

```tsx
  const onboarding = useOnboarding()

  const handleReopenOnboarding = () => {
    onboarding.reopen()
    navigate('/')
  }
```

- [ ] **Step 2: Добавить пункт меню (условно)**

В массиве `items` вставить пункт `onboarding` перед `journal` (показываем только пока есть несделанные шаги — иначе пункт бесполезен, спека §5):

```tsx
    ...(onboarding.hasIncomplete
      ? [
          {
            key: 'onboarding',
            icon: <RocketOutlined />,
            label: t('nav.onboarding'),
            onClick: handleReopenOnboarding,
          },
        ]
      : []),
    {
      key: 'journal',
      icon: <HistoryOutlined />,
      label: t('nav.journal'),
      onClick: () => navigate('/journal'),
    },
```

- [ ] **Step 3: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка. Если tsc ругается на тип элемента спреда в `items` — обернуть условный пункт как `MenuProps['items']` через явный тип переменной перед `items` или привести `as const`; проще: вынести пункт в переменную `const onboardingItem: MenuProps['items'] = onboarding.hasIncomplete ? [{ ... }] : []` и заспредить `...onboardingItem`.

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/src/app/layout/profile-menu.tsx
git commit -m "feat(onboarding): пункт «Первые шаги» в меню профиля"
```

---

## Task 8: Часть C — CTA в пустых экранах

**Files:**
- Modify: `apps/frontend/src/pages/groups/groups-page.tsx`
- Modify: `apps/frontend/src/entities/groups/details/group-detail.tsx`
- Modify: `apps/frontend/src/pages/trainings/trainings-page.tsx`
- Modify: `apps/frontend/src/pages/individual/individual-page.tsx`
- Modify: `apps/frontend/src/entities/finance/pricing/pricing-tab.tsx`
- Modify: `apps/frontend/src/pages/finance/finance-page.tsx`

Паттерн CTA (из `today-agenda.tsx:49-60`): `action={<Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={handler}>{t('...')}</Button>}`. Подписи переиспользуем из существующих ключей.

- [ ] **Step 1: Группы — CTA «Создать группу»**

В `apps/frontend/src/pages/groups/groups-page.tsx` заменить пустой экран (строка ~86):

```tsx
        <EmptyState title={t('groups.empty')} text={t('groups.emptyText')} />
```

на:

```tsx
        <EmptyState
          title={t('groups.empty')}
          text={t('groups.emptyText')}
          action={
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={page.openCreate}>
              {t('groups.create')}
            </Button>
          }
        />
```

(`Button`, `PlusOutlined`, `page.openCreate` уже доступны в файле.)

- [ ] **Step 2: Детали группы — проп `onAddStudent` + CTA «Добавить ученика»**

В `apps/frontend/src/entities/groups/details/group-detail.tsx`:

Добавить `Button` импорт уже есть; добавить иконку `PlusOutlined` в импорт иконок:

```tsx
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'
```

Расширить пропсы:

```tsx
interface GroupDetailProps {
  group: Group
  onBack: () => void
  onEdit: (group: Group) => void
  onOpenStudent: (studentId: string) => void
  onAddStudent: () => void
}
```

```tsx
export function GroupDetail({ group, onBack, onEdit, onOpenStudent, onAddStudent }: GroupDetailProps) {
```

Заменить пустой экран (строка ~161):

```tsx
        <EmptyState title={t('groups.detail.noStudents')} icon={<TeamOutlined />} />
```

на:

```tsx
        <EmptyState
          title={t('groups.detail.noStudents')}
          icon={<TeamOutlined />}
          action={
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={onAddStudent}>
              {t('students.add')}
            </Button>
          }
        />
```

- [ ] **Step 3: Страница групп — состояние создания ученика и проброс `onAddStudent`**

В `apps/frontend/src/pages/groups/groups-page.tsx`:

Добавить состояние создания рядом с существующими (`drawerId`/`editId`/`studentFormKey`):

```tsx
  const [createStudentOpen, setCreateStudentOpen] = useState(false)
```

Добавить обработчики:

```tsx
  const handleAddStudent = () => {
    setEditId(null)
    setStudentFormKey((k) => k + 1)
    setCreateStudentOpen(true)
  }
  const handleCloseStudentForm = () => {
    setEditId(null)
    setCreateStudentOpen(false)
  }
```

(заменив прежний `handleCloseStudentForm`, который делал только `setEditId(null)`.)

Пробросить `onAddStudent` в `GroupDetail`:

```tsx
        <GroupDetail
          group={page.openedGroup}
          onBack={handleBack}
          onEdit={page.openEdit}
          onOpenStudent={setDrawerId}
          onAddStudent={handleAddStudent}
        />
```

Открыть `StudentFormModal` и в режиме создания, и в режиме правки:

```tsx
        <StudentFormModal
          key={studentFormKey}
          open={createStudentOpen || !!editId}
          student={editStudent}
          onClose={handleCloseStudentForm}
        />
```

(При создании `editId === null` ⇒ `editStudent === null` ⇒ форма открывается в режиме нового ученика.)

- [ ] **Step 4: Тренировки — CTA «Создать занятие»**

В `apps/frontend/src/pages/trainings/trainings-page.tsx` заменить пустой экран (строка ~121):

```tsx
        <EmptyState title={t('trainings.empty')} text={t('trainings.emptyText')} />
```

на:

```tsx
        <EmptyState
          title={t('trainings.empty')}
          text={t('trainings.emptyText')}
          action={
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={page.openTypeModal}>
              {t('home.recordTraining')}
            </Button>
          }
        />
```

Проверить, что `Button` и `PlusOutlined` импортированы в файле; если нет — добавить `import { Button } from 'antd'` и `PlusOutlined` в импорт иконок. Проверить точное имя обработчика открытия модалки выбора типа (ожидается `page.openTypeModal` — то же, что у кнопки в шапке страницы); если имя иное, использовать его.

- [ ] **Step 5: Индивидуальные — CTA «Записать занятие»**

В `apps/frontend/src/pages/individual/individual-page.tsx` заменить пустой экран (строки ~174-177):

```tsx
          <EmptyState
            title={t('individual.noClients')}
            text={t('individual.noClientsText')}
          />
```

на:

```tsx
          <EmptyState
            title={t('individual.noClients')}
            text={t('individual.noClientsText')}
            action={
              <Button
                className="tk-btn-primary"
                icon={<PlusOutlined />}
                disabled={!page.indGroupId}
                onClick={handleOpenSession}
              >
                {t('individual.record')}
              </Button>
            }
          />
```

(`Button`, `PlusOutlined`, `handleOpenSession`, `page.indGroupId` уже доступны в файле; `disabled={!page.indGroupId}` повторяет логику кнопки в шапке.)

- [ ] **Step 6: Тарифы — проп `onAddLocation` + CTA «Добавить локацию»**

В `apps/frontend/src/entities/finance/pricing/pricing-tab.tsx`:

Добавить проп компонента:

```tsx
interface PricingTabProps {
  onAddLocation?: () => void
}

export function PricingTab({ onAddLocation }: PricingTabProps) {
```

Заменить пустой экран «нет локаций» (строка ~60):

```tsx
    return <EmptyState title={t('finance.pricing.noLocations')} />
```

на:

```tsx
    return (
      <EmptyState
        title={t('finance.pricing.noLocations')}
        action={
          onAddLocation ? (
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={onAddLocation}>
              {t('locations.addButton')}
            </Button>
          ) : undefined
        }
      />
    )
```

(`Button` и `PlusOutlined` уже импортированы в файле.)

- [ ] **Step 7: Страница финансов — передать `onAddLocation` в `PricingTab`**

В `apps/frontend/src/pages/finance/finance-page.tsx` заменить (строка ~44):

```tsx
      {page.tab === 'pricing' && <PricingTab />}
```

на:

```tsx
      {page.tab === 'pricing' && <PricingTab onAddLocation={() => page.setTab('locations')} />}
```

- [ ] **Step 8: Проверка сборки**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка. Если tsc сообщает, что `GroupDetail` вызывается ещё где-то без `onAddStudent` — найти такие места (`grep -rn "GroupDetail" apps/frontend/src`) и добавить проп (на момент написания единственный вызов — в `groups-page.tsx`).

- [ ] **Step 9: Коммит**

```bash
git add apps/frontend/src/pages/groups/groups-page.tsx apps/frontend/src/entities/groups/details/group-detail.tsx apps/frontend/src/pages/trainings/trainings-page.tsx apps/frontend/src/pages/individual/individual-page.tsx apps/frontend/src/entities/finance/pricing/pricing-tab.tsx apps/frontend/src/pages/finance/finance-page.tsx
git commit -m "feat(onboarding): CTA-кнопки в пустых экранах (часть C)"
```

---

## Task 9: Финальный гейт и проверка

**Files:** нет новых; прогон проверок.

- [ ] **Step 1: vitest целиком**

Run: `npm test -w apps/frontend`
Expected: PASS, включая новые `onboarding-steps.spec.ts` и `onboarding-storage.spec.ts` (общее число тестов выросло относительно прежних 31).

- [ ] **Step 2: Сборка фронта**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка (tsc + vite).

- [ ] **Step 3: eslint 0/0**

Run: `npm run lint -w apps/frontend` (если скрипт `lint` отсутствует — `npx eslint "apps/frontend/src/**/*.{ts,tsx}"` из корня)
Expected: 0 ошибок, 0 предупреждений.

- [ ] **Step 4: Ручная проверка (на пользователе, без Playwright)**

Сообщить StepOne сценарий для самостоятельной проверки в браузере (правило проекта: Playwright не запускаем без явной просьбы):
1. Зарегистрировать нового тренера (или зайти под демо с пустыми данными) → на главной видна карточка «Первые шаги · 0/5», все шаги активны.
2. Тап по «Добавить локацию» → переход на финансы, вкладка «Локации»; создать локацию → вернуться на главную: шаг «Добавить локацию» отмечен ✓, прогресс вырос.
3. «Пропустить» на шаге «Создать группу» → шаг сереет, не торопит.
4. «Скрыть ✕» → карточка исчезает; меню профиля → «Первые шаги» → карточка вернулась с несделанными шагами.
5. Завершить все шаги (или пропустить остальные) → карточка исчезает сама; пункт «Первые шаги» в меню пропадает, когда все шаги done.
6. Пустые экраны: Группы, Тренировки, Индивидуальные, «нет учеников» в группе, «нет локаций» в тарифах — у каждого крупная CTA-кнопка ведёт в нужную форму/раздел.

- [ ] **Step 5: Финальный коммит (если были правки на гейте)**

```bash
git add -A
git commit -m "chore(onboarding): правки по гейту (build/lint/тесты)"
```

---

## Self-Review (выполнено при написании плана)

**1. Покрытие спеки:**
- §2 гибрид B+C → Tasks 5-6 (B), Task 8 (C). ✓
- §3 пять шагов, каждый можно пропустить, развилка типа на шаге training → `STEP_NAV.training → /trainings`, где `openTypeModal` (Task 8 Step 4). ✓
- §4 автогалочки по данным → Task 1 + Task 4. ✓
- §5 состояние/видимость, per-user localStorage, «Скрыть», «Пропустить», возврат из меню → Tasks 2-4, 7. ✓
- §6 открытие шагов через существующий UI; pricing требует локацию → `OnboardingChecklist.go` (Task 5). ✓
- §7 умные пустые экраны (5 шт.) → Task 8 (groups, trainings, individual, group-detail noStudents, pricing noLocations). ✓
- §8 структура модуля → File Structure + Tasks 1-5. ✓
- §9 i18n onboarding.* + плюрализация → Task 5 Steps 1-2 (`stepsLeft*`). ✓
- §10 тесты vitest для чистых функций → Tasks 1-2; гейт Task 9. ✓
- §11 вне скоупа (бэкенд, визард, изменение flow регистрации) → не затрагивается. ✓
- §12 ловушки: группа по `isIndividual` (Task 4), per-user ключ (Tasks 2-3), не мигать на загрузке (`isReady` в Task 4). ✓

**2. Placeholder-скан:** код приведён полностью в каждом шаге, без «добавьте обработку ошибок»/«аналогично Task N». ✓

**3. Согласованность типов:** `OnboardingStepId`/`OnboardingStepStatus`/`OnboardingStep`/`OnboardingFlags` определены в Task 1 и используются в Tasks 2-5 с теми же именами; `buildOnboardingSteps`/`isChecklistVisible`/`countDone` — одинаковые сигнатуры везде; `useOnboarding` возвращает `{ steps, visible, hasIncomplete, doneCount, total, skipStep, hide, reopen }` и ровно эти поля читаются в Task 5 (карточка) и Task 7 (меню). ✓

**Известные упрощения (осознанные):** `hasPricing` проверяется по дефолтной локации (тариф на не-дефолтной — редкий кейс); меню профиля вызывает `useOnboarding`, т.е. дата-хуки становятся глобальными, но данные кэшируются react-query и уже используются по приложению.
