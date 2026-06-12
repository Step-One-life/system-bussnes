# «Мой день»: быстрая отметка и деньги в один экран — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Главная закрывает 90% дневного цикла тренера: отметка из ленты в 1–2 тапа, пакетное «Закрыть день» (вкл. вчера), предзаполненные шторки продления/оплаты — всё mobile-first, бэкенд не меняется.

**Architecture:** Эволюция текущей главной (спека `docs/superpowers/specs/2026-06-13-my-day-quick-actions-design.md`). Хук `use-mark-today` обобщается в `useDayMarking(date)` с новым дефолтом «все пришли»; поверх него два UI: `QuickMarkSheet` (одно занятие, из ленты) и `CloseDaySheet` (весь день, галочка на занятие). Денежные модалки получают предзаполнение. Все новые поверхности — `AdaptiveSheet` (Drawer bottom на мобиле / Modal на десктопе). Чистая логика выносится в `*-model.ts`-файлы и покрывается vitest.

**Tech Stack:** React 19 + antd v6 + react-query + i18next; vitest (новый, только чистые функции, без jsdom); стили — токены `--tk-*`.

**Ветка:** `feat/my-day-quick-actions` (уже создана, спека закоммичена).

**Конвенции (обязательны):** без точек с запятой, одинарные кавычки, отступ 2 пробела. Все UI-тексты через `t('...')`, ключи в `apps/frontend/src/locales/{ru,en}/translation.json` (оба файла синхронно). Импорты сортирует eslint simple-import-sort — после правок гонять `npx eslint src --fix` в `apps/frontend`.

**Гейты после каждой задачи:** `npm run build -w apps/frontend` (tsc+vite) зелёный; с Задачи 1 — ещё `npm test -w apps/frontend`.

---

## Карта файлов

| Файл | Действие | Ответственность |
|---|---|---|
| `apps/frontend/package.json` | Modify | devDep `vitest`, скрипт `test` |
| `apps/frontend/src/common/utils/date.ts` | Modify | + `yesterdayISO()` |
| `apps/frontend/src/pages/home/agenda-model.ts` | Modify | + `needsMark(item, nowMin)` |
| `apps/frontend/src/pages/home/agenda-model.spec.ts` | Create | тесты `needsMark` + смоук `minutesOfDay` |
| `apps/frontend/src/common/hooks/use-is-mobile.ts` | Create | matchMedia ≤768px |
| `apps/frontend/src/common/ui/adaptive-sheet/adaptive-sheet.tsx` + `.scss` | Create | Drawer(bottom)/Modal по брейкпоинту |
| `apps/frontend/src/common/ui/index.ts` | Modify | экспорт `AdaptiveSheet` |
| `apps/frontend/src/pages/home/day-marking-model.ts` + `.spec.ts` | Create | чистые: `indKey`, дефолты галочек, `closeDaySummary` |
| `apps/frontend/src/pages/home/billing-preview.ts` + `.spec.ts` | Create | чистая `previewBilling` |
| `apps/frontend/src/pages/home/use-day-marking.ts` | Create | обобщение `use-mark-today` (date + selection) |
| `apps/frontend/src/pages/home/use-mark-today.ts` | Delete | заменён `use-day-marking` |
| `apps/frontend/src/pages/home/mark-student-row.tsx` | Create | строка ученика (чекбокс+статус+гейт+биллинг) |
| `apps/frontend/src/pages/home/quick-mark-sheet.tsx` + `.scss` | Create | шторка отметки одного занятия |
| `apps/frontend/src/pages/home/close-day-sheet.tsx` + `.scss` | Create | пакетное закрытие дня (любая дата) |
| `apps/frontend/src/pages/home/mark-today-modal.tsx` + `.scss` | Delete | заменён `close-day-sheet` |
| `apps/frontend/src/pages/home/today-agenda.tsx` | Modify | кнопка «Отметить», row → div |
| `apps/frontend/src/pages/home/use-home-page.ts` | Modify | + `yesterdayBlocks` |
| `apps/frontend/src/pages/home/home-page.tsx` | Modify | интеграция шторок + сигнал «вчера» |
| `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx` | Modify | префилл типа, цена, «Оплачен сразу», AdaptiveSheet |
| `apps/frontend/src/entities/finance/form/mark-paid-modal.tsx` | Modify | Modal → AdaptiveSheet |
| `apps/frontend/src/locales/{ru,en}/translation.json` | Modify | новые ключи (перечислены в задачах) |
| `docs/ARCHITECTURE.md`, спека | Modify | vitest-гейт, поправка пути QuickMarkSheet |

Проверенные факты кодовой базы (не перепроверять):
- `markAttendance(training, studentIds)` (`entities/trainings/model/training-logic.ts:186`) возвращает `MarkResult[]` с `billing`; бэкенд идемпотентен, транзакции есть.
- `addSubscription` возвращает `Promise<Subscription | null>`; паттерн «оплата при покупке» = `autoCreatePayment(studentId, {id, type, createdAt}, isIndividual, opts)` + `linkPaymentToSub` (см. `entities/students/subscriptions/add-sub-modal.tsx:83-104`).
- Алиасы `app/common/entities/pages` заданы в `vite.config.ts` → vitest подхватит их автоматически.
- Гейт «без абонемента»: `needsSub = (type) => type === 'none' || type === 'expired'`; чекбокс disabled, тап → `RenewSubModal issueMode`. Поведение гейта НЕ меняем (в т.ч. для парных).

---

### Task 1: vitest-инфраструктура + смоук-тест

**Files:**
- Modify: `apps/frontend/package.json`
- Create: `apps/frontend/src/pages/home/agenda-model.spec.ts`

- [ ] **Step 1: Установить vitest**

```bash
cd "/Users/StepOne/Desktop/Мой проект" && npm i -D vitest -w apps/frontend
```

- [ ] **Step 2: Добавить скрипт `test`**

В `apps/frontend/package.json` в `"scripts"` после `"lint"`:

```json
    "lint": "eslint .",
    "test": "vitest run",
```

- [ ] **Step 3: Смоук-тест на существующую чистую функцию**

Создать `apps/frontend/src/pages/home/agenda-model.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { minutesOfDay } from './agenda-model'

describe('minutesOfDay', () => {
  it('считает минуты с начала суток', () => {
    expect(minutesOfDay(new Date(2026, 5, 13, 11, 30))).toBe(690)
  })
})
```

- [ ] **Step 4: Запустить**

Run: `npm test -w apps/frontend`
Expected: `1 passed`

- [ ] **Step 5: Проверить, что сборка не сломалась (spec-файлы в src попадают под tsc)**

Run: `npm run build -w apps/frontend`
Expected: успех. Если tsc ругается на vitest-типы — добавить `"vitest"` нигде не нужно (импорт явный); если ругается на `import.meta` — не трогать, значит ошибка в другом.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/package.json package-lock.json apps/frontend/src/pages/home/agenda-model.spec.ts
git commit -m "test(frontend): vitest для чистых функций + смоук agenda-model"
```

---

### Task 2: `needsMark` в agenda-model + `yesterdayISO` (TDD)

**Files:**
- Modify: `apps/frontend/src/pages/home/agenda-model.ts`
- Modify: `apps/frontend/src/common/utils/date.ts`
- Test: `apps/frontend/src/pages/home/agenda-model.spec.ts`

- [ ] **Step 1: Дописать падающие тесты в `agenda-model.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { minutesOfDay, needsMark } from './agenda-model'

import type { AgendaItem } from './agenda-model'
import type { CalendarBlock } from 'entities/trainings'

function item(startMin: number, endMin: number, attendeesCount: number): AgendaItem {
  return {
    startMin,
    endMin,
    typeKey: 'group',
    block: { attendeesCount } as CalendarBlock,
  }
}

describe('needsMark', () => {
  it('прошедшее без отметки — требует', () => {
    expect(needsMark(item(600, 660, 0), 700)).toBe(true)
  })
  it('идущее без отметки — требует', () => {
    expect(needsMark(item(600, 660, 0), 630)).toBe(true)
  })
  it('будущее — не требует', () => {
    expect(needsMark(item(600, 660, 0), 599)).toBe(false)
  })
  it('уже отмеченное — не требует', () => {
    expect(needsMark(item(600, 660, 3), 700)).toBe(false)
  })
})
```

(блок `describe('minutesOfDay')` из Задачи 1 остаётся)

- [ ] **Step 2: Убедиться, что падает**

Run: `npm test -w apps/frontend`
Expected: FAIL — `needsMark is not a function` / нет экспорта.

- [ ] **Step 3: Реализация в `agenda-model.ts`** (после `buildAgendaItems`)

```ts
/** Занятие требует отметки: уже началось, а посещения не проставлены. */
export function needsMark(item: AgendaItem, nowMin: number): boolean {
  return item.startMin <= nowMin && item.block.attendeesCount === 0
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `npm test -w apps/frontend`
Expected: PASS (5 тестов).

- [ ] **Step 5: `yesterdayISO` в `common/utils/date.ts`** (после `todayISO`)

```ts
export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toLocalISODate(d)
}
```

- [ ] **Step 6: Сборка + commit**

```bash
npm run build -w apps/frontend
git add apps/frontend/src/pages/home/agenda-model.ts apps/frontend/src/pages/home/agenda-model.spec.ts apps/frontend/src/common/utils/date.ts
git commit -m "feat(frontend): needsMark в модели агенды + yesterdayISO (TDD)"
```

---

### Task 3: `useIsMobile` + `AdaptiveSheet`

**Files:**
- Create: `apps/frontend/src/common/hooks/use-is-mobile.ts`
- Create: `apps/frontend/src/common/ui/adaptive-sheet/adaptive-sheet.tsx`
- Create: `apps/frontend/src/common/ui/adaptive-sheet/adaptive-sheet.scss`
- Modify: `apps/frontend/src/common/ui/index.ts`

- [ ] **Step 1: Хук `use-is-mobile.ts`**

```ts
import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 768px)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Мобильный брейкпоинт (≤768px), живой при ресайзе. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)
}
```

- [ ] **Step 2: `adaptive-sheet.tsx`**

```tsx
import { Drawer, Modal } from 'antd'

import { useIsMobile } from 'common/hooks/use-is-mobile'

import type { ReactNode } from 'react'

import './adaptive-sheet.scss'

interface AdaptiveSheetProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Мобайл — нижняя шторка (Drawer bottom), десктоп — модалка. Один API.
 * antd v6: ширину/высоту панели задавать через styles.wrapper.
 */
export function AdaptiveSheet({ open, title, onClose, footer, children }: AdaptiveSheetProps) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer
        open={open}
        title={title}
        placement="bottom"
        onClose={onClose}
        rootClassName="adaptive-sheet"
        styles={{ wrapper: { height: 'auto', maxHeight: '85dvh' } }}
        footer={footer}
        destroyOnHidden
      >
        {children}
      </Drawer>
    )
  }
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
      width="min(520px, 95vw)"
    >
      {children}
    </Modal>
  )
}
```

- [ ] **Step 3: `adaptive-sheet.scss`**

```scss
/* Скруглённый верх шторки + грабер; крупные зоны тапа внутри задают
   сами потребители. Цвета — токены, фон панели рисует antd-тема. */
.adaptive-sheet {
  .ant-drawer-content {
    border-radius: var(--tk-radius-card) var(--tk-radius-card) 0 0;
  }

  .ant-drawer-header {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 6px;
      left: 50%;
      width: 32px;
      height: 3px;
      transform: translateX(-50%);
      border-radius: 2px;
      background: var(--tk-border-strong);
    }
  }

  .ant-drawer-body {
    overflow-y: auto;
  }
}
```

- [ ] **Step 4: Экспорт в `common/ui/index.ts`** (по алфавиту, первой строкой после Badge-блока)

```ts
export { AdaptiveSheet } from './adaptive-sheet/adaptive-sheet'
```

- [ ] **Step 5: Сборка + commit**

```bash
npm run build -w apps/frontend
git add apps/frontend/src/common/hooks/use-is-mobile.ts apps/frontend/src/common/ui/adaptive-sheet apps/frontend/src/common/ui/index.ts
git commit -m "feat(frontend): AdaptiveSheet — Drawer bottom на мобиле / Modal на десктопе"
```

---

### Task 4: чистая модель дневной отметки (TDD)

**Files:**
- Create: `apps/frontend/src/pages/home/day-marking-model.ts`
- Test: `apps/frontend/src/pages/home/day-marking-model.spec.ts`

- [ ] **Step 1: Падающие тесты `day-marking-model.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'

import {
  closeDaySummary,
  defaultGroupChecks,
  defaultIndChecks,
  indKey,
} from './day-marking-model'

const member = (id: string) => ({ id }) as { id: string }

describe('defaultGroupChecks', () => {
  it('неотмеченное занятие — предотмечен весь состав, кроме гейтнутых', () => {
    const res = defaultGroupChecks(
      { existing: null },
      [member('a'), member('b'), member('c')],
      (s) => s.id !== 'b',
    )
    expect(res).toEqual(new Set(['a', 'c']))
  })
  it('пустое занятие (запись есть, отметок нет) — тоже весь состав', () => {
    const res = defaultGroupChecks({ existing: { attendees: [] } }, [member('a')], () => true)
    expect(res).toEqual(new Set(['a']))
  })
  it('уже отмеченное — фактические отметки, состав не доставляется', () => {
    const res = defaultGroupChecks(
      { existing: { attendees: ['a'] } },
      [member('a'), member('b')],
      () => true,
    )
    expect(res).toEqual(new Set(['a']))
  })
})

describe('defaultIndChecks', () => {
  it('плановый с абонементом — пришёл; гейтнутый — нет; отмеченный — как есть', () => {
    const slots = [
      { trainingId: 't1', studentId: 's1', originalPresent: false },
      { trainingId: 't2', studentId: 's2', originalPresent: false },
      { trainingId: 't3', studentId: 's3', originalPresent: true },
    ]
    const res = defaultIndChecks(slots, (slot) => slot.studentId !== 's2')
    expect(res).toEqual({
      [indKey('t1', 's1')]: true,
      [indKey('t2', 's2')]: false,
      [indKey('t3', 's3')]: true,
    })
  })
})

describe('closeDaySummary', () => {
  it('считает только выбранные строки с кем-то к отметке', () => {
    const rows = [
      { key: 'g1', alreadyMarked: false, willMark: 5 },
      { key: 'g2', alreadyMarked: true, willMark: 0 },
      { key: 'i1', alreadyMarked: false, willMark: 1 },
      { key: 'i2', alreadyMarked: false, willMark: 1 },
    ]
    expect(closeDaySummary(rows, new Set(['g1', 'g2', 'i1']))).toEqual({
      trainings: 2,
      students: 6,
    })
  })
})
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -w apps/frontend`
Expected: FAIL — модуля нет.

- [ ] **Step 3: Реализация `day-marking-model.ts`**

```ts
/** Ключ галочки индивидуальной строки: у парного занятия один trainingId на двоих. */
export const indKey = (trainingId: string, studentId: string) => `${trainingId}:${studentId}`

interface HasId {
  id: string
}

interface GroupSlotLike {
  existing: { attendees: string[] } | null
}

/**
 * Дефолт галочек группового занятия: уже отмеченное — фактические отметки;
 * неотмеченное — «все пришли» (весь состав, кроме тех, кого гейт не пускает).
 */
export function defaultGroupChecks<S extends HasId>(
  slot: GroupSlotLike,
  members: S[],
  canMark: (s: S) => boolean,
): Set<string> {
  const marked = slot.existing?.attendees ?? []
  if (marked.length > 0) return new Set(marked)
  return new Set(members.filter(canMark).map((s) => s.id))
}

export interface IndSlotLike {
  trainingId: string
  studentId: string
  originalPresent: boolean
}

/** Дефолт индивидуальных строк: отмеченный — как есть, плановый — пришёл (если не гейтнут). */
export function defaultIndChecks(
  slots: IndSlotLike[],
  canMark: (slot: IndSlotLike) => boolean,
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const s of slots) {
    out[indKey(s.trainingId, s.studentId)] = s.originalPresent || canMark(s)
  }
  return out
}

export interface CloseDayRowCount {
  key: string
  alreadyMarked: boolean
  /** Сколько человек отметится галочкой «прошло как запланировано». */
  willMark: number
}

/** Итог для кнопки «Отметить всё · N занятий, K человек». */
export function closeDaySummary(
  rows: CloseDayRowCount[],
  checkedKeys: Set<string>,
): { trainings: number; students: number } {
  let trainings = 0
  let students = 0
  for (const r of rows) {
    if (r.alreadyMarked || !checkedKeys.has(r.key) || r.willMark === 0) continue
    trainings += 1
    students += r.willMark
  }
  return { trainings, students }
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `npm test -w apps/frontend`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/home/day-marking-model.ts apps/frontend/src/pages/home/day-marking-model.spec.ts
git commit -m "feat(frontend): чистая модель дневной отметки — дефолты галочек и сводка (TDD)"
```

---

### Task 5: чистое превью биллинга (TDD)

**Files:**
- Create: `apps/frontend/src/pages/home/billing-preview.ts`
- Test: `apps/frontend/src/pages/home/billing-preview.spec.ts`

Перед кодом проверить: `grep -n "findSubForGroup" apps/frontend/src/entities/students/index.ts` — экспорт должен быть; если нет, добавить реэкспорт из `./model/subscription-status`.

- [ ] **Step 1: Падающие тесты `billing-preview.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { previewBilling } from './billing-preview'

import type { PricingRule } from 'entities/finance/model/types'
import type { Student } from 'entities/students'

const sub = (groupId: string, remaining: number) =>
  ({ groupId, remaining, isActive: true, groupIds: [] }) as unknown

function student(subs: unknown[]): Student {
  return { id: 's1', name: 'Вася', subscriptions: subs } as unknown as Student
}

const pairRule = {
  lesson_kind: 'pair',
  pricing_format: 'single',
  duration_minutes: 60,
  sessions_count: 1,
  client_price: 1200,
  client_prime_price: 1500,
} as unknown as PricingRule

describe('previewBilling', () => {
  it('активный абонемент — спишется занятие', () => {
    const res = previewBilling({
      student: student([sub('Старт', 3)]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'subscription', remaining: 3 })
  })
  it('парное — разовый платёж по тарифу (прайм-цена в прайм)', () => {
    const base = {
      student: student([]),
      groupId: 'Индивидуальные',
      isPair: true,
      sessionDuration: 60,
      rules: [pairRule],
    }
    expect(previewBilling({ ...base, isPrime: false })).toEqual({ kind: 'payment', amount: 1200 })
    expect(previewBilling({ ...base, isPrime: true })).toEqual({ kind: 'payment', amount: 1500 })
  })
  it('парное без тарифа — платёж без суммы', () => {
    const res = previewBilling({
      student: student([]),
      groupId: 'Индивидуальные',
      isPair: true,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'payment', amount: null })
  })
  it('без абонемента (не парное) — гейт', () => {
    const res = previewBilling({
      student: student([]),
      groupId: 'Старт',
      isPair: false,
      isPrime: false,
      sessionDuration: 60,
      rules: [],
    })
    expect(res).toEqual({ kind: 'gated' })
  })
})
```

Если поля `PricingRule` называются иначе — открыть `entities/finance/model/types.ts`, поправить фикстуру под реальные имена (snake_case как в `mark-paid-modal.tsx`: `client_price`, `client_prime_price`).

- [ ] **Step 2: Запустить — FAIL**

Run: `npm test -w apps/frontend`

- [ ] **Step 3: Реализация `billing-preview.ts`**

```ts
import { clientTypeToTuple, matchRule } from 'entities/finance/lib/pricing-lookup'
import { findSubForGroup } from 'entities/students'

import type { PricingRule } from 'entities/finance/model/types'
import type { Student } from 'entities/students'

export type BillingPreview =
  | { kind: 'subscription'; remaining: number }
  | { kind: 'payment'; amount: number | null }
  | { kind: 'gated' }

interface PreviewArgs {
  student: Student
  /** Имя группы (как в training.groupId на фронте). */
  groupId: string
  isPair: boolean
  isPrime: boolean
  sessionDuration: number
  /** Тарифы локации занятия. */
  rules: PricingRule[]
}

/**
 * Что произойдёт с деньгами при отметке. Оценка на клиенте — источник истины
 * это billing[] из ответа бэка; зеркалит attendance-pricing: парные никогда
 * не списывают абонемент, остальные — абонемент, иначе гейт (отметка без
 * абонемента в UI запрещена, ведёт в оформление).
 */
export function previewBilling(args: PreviewArgs): BillingPreview {
  const { student, groupId, isPair, isPrime, sessionDuration, rules } = args
  if (isPair) {
    const type = sessionDuration >= 90 ? 'single_pair_90' : 'single_pair'
    const rule = matchRule(rules, clientTypeToTuple(type))
    if (!rule) return { kind: 'payment', amount: null }
    return { kind: 'payment', amount: isPrime ? rule.client_prime_price : rule.client_price }
  }
  const sub = findSubForGroup(student, groupId, sessionDuration)
  if (sub) return { kind: 'subscription', remaining: sub.remaining }
  return { kind: 'gated' }
}
```

Если `clientTypeToTuple` принимает иной тип аргумента — свериться с сигнатурой в `entities/finance/lib/pricing-lookup.ts:66` и привести литералы к ней.

- [ ] **Step 4: Тесты зелёные + сборка**

Run: `npm test -w apps/frontend && npm run build -w apps/frontend`

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/home/billing-preview.ts apps/frontend/src/pages/home/billing-preview.spec.ts apps/frontend/src/entities/students/index.ts
git commit -m "feat(frontend): previewBilling — клиентская оценка списания/платежа (TDD)"
```

---

### Task 6: `useDayMarking(date)` — обобщение use-mark-today

**Files:**
- Create: `apps/frontend/src/pages/home/use-day-marking.ts`
- Modify: `apps/frontend/src/pages/home/mark-today-modal.tsx` (только импорты/вызов)
- Delete: `apps/frontend/src/pages/home/use-mark-today.ts`

Суть: копия `use-mark-today.ts` с четырьмя изменениями — (1) параметр `dateStr`, (2) `initChecks` через дефолты из `day-marking-model` + гейт, (3) `save(selection?)` принимает явный выбор, (4) `indKey` реэкспортируется из модели.

- [ ] **Step 1: Создать `use-day-marking.ts`** (полный файл)

```ts
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDayOfWeek } from 'common/utils/date'
import { groupKeys, useGroups } from 'entities/groups'
import { getSubStatus, studentKeys, useStudents } from 'entities/students'
import {
  createTraining,
  markAttendance,
  removeAttendee,
  trainingKeys,
  useTrainings,
} from 'entities/trainings'

import { defaultGroupChecks, defaultIndChecks, indKey } from './day-marking-model'

import type { Training } from 'entities/trainings'

export { indKey }

export interface DayGroup {
  groupId: string
  time: string
  duration: number
  existing: Training | null
  originalAttendees: Set<string>
}

export interface DayIndividual {
  trainingId: string
  studentId: string
  time: string
  groupId: string
  originalPresent: boolean
}

/** Явный выбор для save — у «Закрыть день» источник истины свой (галочки занятий). */
export interface MarkSelection {
  groups: Record<string, Set<string>>
  ind: Record<string, boolean>
}

/** Отметить без активного абонемента нельзя — тап ведёт в оформление. */
export const needsSub = (type: string) => type === 'none' || type === 'expired'

export function useDayMarking(open: boolean, onClose: () => void, dateStr: string) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const dow = formatDayOfWeek(dateStr)

  const [checks, setChecks] = useState<Record<string, Set<string>>>({})
  const [indChecks, setIndChecks] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const dayGroups: DayGroup[] = useMemo(() => {
    if (!open) return []
    const result: DayGroup[] = []
    for (const g of groups) {
      if (g.isIndividual) continue
      const entry = (g.schedule ?? []).find((s) => s.day === dow)
      if (!entry) continue
      const existing =
        trainings.find((t) => t.groupId === g.name && t.date === dateStr) ?? null
      result.push({
        groupId: g.name,
        time: entry.time || '',
        duration: g.duration ?? 60,
        existing,
        originalAttendees: new Set(existing?.attendees ?? []),
      })
    }
    return result
  }, [open, groups, trainings, dow, dateStr])

  const dayIndividuals: DayIndividual[] = useMemo(() => {
    if (!open) return []
    const result: DayIndividual[] = []
    for (const g of groups) {
      if (!g.isIndividual) continue
      const dayTrs = trainings.filter((t) => t.groupId === g.name && t.date === dateStr)
      for (const tr of dayTrs) {
        // Отмеченные ∪ плановые: наполовину отмеченное парное показывает обоих,
        // плановый виден даже когда на занятии уже есть другие attendees.
        const planned = [tr.plannedStudentId, tr.plannedStudentId2].filter(
          (sid): sid is string => !!sid,
        )
        const ids = [...new Set([...tr.attendees, ...planned])]
        for (const sid of ids) {
          result.push({
            trainingId: tr.id,
            studentId: sid,
            time: tr.time ?? '',
            groupId: g.name,
            originalPresent: tr.attendees.includes(sid),
          })
        }
      }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time))
  }, [open, groups, trainings, dateStr])

  // Дефолт «все пришли»: неотмеченные занятия предотмечены составом/плановыми,
  // кроме гейтнутых (нет активного абонемента); отмеченные — фактом.
  const initChecks = () => {
    const init: Record<string, Set<string>> = {}
    for (const dg of dayGroups) {
      const members = students.filter((s) => s.groups.includes(dg.groupId))
      init[dg.groupId] = defaultGroupChecks(
        { existing: dg.existing },
        members,
        (s) => !needsSub(getSubStatus(s, dg.groupId, dg.duration).type),
      )
    }
    setChecks(init)
    setIndChecks(
      defaultIndChecks(dayIndividuals, (slot) => {
        const st = students.find((s) => s.id === slot.studentId)
        return !!st && !needsSub(getSubStatus(st, slot.groupId).type)
      }),
    )
  }

  const toggle = (groupId: string, studentId: string) => {
    setChecks((prev) => {
      const next = { ...prev }
      const set = new Set(next[groupId] ?? [])
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      next[groupId] = set
      return next
    })
  }

  const toggleInd = (trainingId: string, studentId: string) => {
    const key = indKey(trainingId, studentId)
    setIndChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const save = async (selection?: MarkSelection) => {
    const selGroups = selection?.groups ?? checks
    const selInd = selection?.ind ?? indChecks
    setSaving(true)
    try {
      const noTariff: string[] = []
      for (const dg of dayGroups) {
        if (!(dg.groupId in selGroups)) continue
        const checked = [...(selGroups[dg.groupId] ?? [])]
        const toAdd = checked.filter((id) => !dg.originalAttendees.has(id))
        const toRemove = [...dg.originalAttendees].filter((id) => !checked.includes(id))

        let training = dg.existing
        if (!training && checked.length > 0) {
          training = await createTraining({
            groupId: dg.groupId,
            date: dateStr,
            time: dg.time,
            attendees: [],
            sessionDuration: dg.duration,
          })
        }
        if (!training) continue

        if (toAdd.length) {
          const results = await markAttendance(training, toAdd)
          noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
        }

        for (const sid of toRemove) {
          await removeAttendee(training.id, sid)
        }
      }

      for (const ti of dayIndividuals) {
        const key = indKey(ti.trainingId, ti.studentId)
        if (!(key in selInd)) continue
        const isChecked = selInd[key]
        if (!isChecked && ti.originalPresent) {
          await removeAttendee(ti.trainingId, ti.studentId)
        } else if (isChecked && !ti.originalPresent) {
          const tr = trainings.find((t) => t.id === ti.trainingId)
          if (tr) {
            const results = await markAttendance(tr, [ti.studentId])
            noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
          }
        }
      }

      if (noTariff.length) {
        toast({ type: 'warn', title: t('finance.autoRecord.noTariff'), msg: noTariff.join(', ') })
      }
      toast({ type: 'success', title: t('home.attendanceSaved') })
      onClose()
    } catch (e) {
      // Сбой посередине циклов: часть отметок уже применена — сообщаем об
      // ошибке, а кэши перечитываются в finally, чтобы UI показал факт.
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: groupKeys.all })
      setSaving(false)
    }
  }

  return { dayGroups, dayIndividuals, students, trainings, checks, indChecks, toggle, toggleInd, initChecks, save, saving }
}
```

(`trainings` отдаётся наружу — QuickMarkSheet ищет по нему `isPair`/`sessionDuration`, не плодя второй запрос.)

Важно: `save(selection)` пропускает группы/строки, которых нет в selection (ключа нет ⇒ не трогаем) — это позволяет QuickMarkSheet и «Закрыть день» сохранять только свой срез. Поведение без selection идентично старому. Проверить, что `getSubStatus` экспортируется из `entities/students` (использовался так в mark-today-modal).

- [ ] **Step 2: Переключить `mark-today-modal.tsx` на новый хук**

Заменить импорт и вызов:

```ts
import { todayISO } from 'common/utils/date'
import { indKey, useDayMarking } from './use-day-marking'
```

```ts
  const {
    dayGroups: todayGroups,
    dayIndividuals: todayIndividuals,
    students,
    checks,
    indChecks,
    toggle,
    toggleInd,
    initChecks,
    save,
    saving,
  } = useDayMarking(open, handleClose, todayISO())
  // `trainings` из return хука здесь не нужен — не деструктурировать.
```

(`save` в onClick остаётся как `onClick={save}` — поменять на `onClick={() => save()}`, т.к. сигнатура теперь с аргументом и event попадёт в параметр.)

- [ ] **Step 3: Удалить старый хук**

```bash
git rm apps/frontend/src/pages/home/use-mark-today.ts
```

- [ ] **Step 4: Гейты**

Run: `npm run build -w apps/frontend && npm test -w apps/frontend`
Expected: успех. Затем `cd apps/frontend && npx eslint src --fix && npx eslint src` — 0/0.

- [ ] **Step 5: Ручная проверка дефолта** (бэк+фронт подняты, demo@trikick.ru/demo1234): открыть «Отметить день» — у неотмеченных занятий галочки стоят у всех с абонементом; у гейтнутых — нет.

- [ ] **Step 6: Commit**

```bash
git add -A apps/frontend/src/pages/home
git commit -m "feat(frontend): useDayMarking(date) — обобщение отметки дня, дефолт «все пришли», save по срезу"
```

---

### Task 7: `MarkStudentRow` + `QuickMarkSheet`

**Files:**
- Create: `apps/frontend/src/pages/home/mark-student-row.tsx`
- Create: `apps/frontend/src/pages/home/quick-mark-sheet.tsx`
- Create: `apps/frontend/src/pages/home/quick-mark-sheet.scss`
- Modify: `apps/frontend/src/locales/ru/translation.json`, `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: i18n-ключи**

В `ru/translation.json` в объект `home` добавить:

```json
"quickMark": "Отметить",
"quickMarkDone": "Готово · {{checked}} из {{total}}",
"billingSub": "спишется занятие · осталось {{count}}",
"billingPayment": "разовый платёж · {{amount}} ₽",
"billingNoTariff": "разовый платёж · нет тарифа"
```

В `en/translation.json` те же ключи:

```json
"quickMark": "Mark",
"quickMarkDone": "Done · {{checked}} of {{total}}",
"billingSub": "session will be deducted · {{count}} left",
"billingPayment": "one-time payment · {{amount}} ₽",
"billingNoTariff": "one-time payment · no tariff"
```

- [ ] **Step 2: `mark-student-row.tsx`** — строка ученика, извлечённая из mark-today-modal (один в один по классам `mark-row*`, чтобы переиспользовать его scss; стили подключает потребитель)

```tsx
import { Button, Checkbox } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge } from 'common/ui'

import type { SubStatus } from 'entities/students'
import type { ReactNode } from 'react'

interface MarkStudentRowProps {
  name: string
  status: SubStatus
  checked: boolean
  /** Без активного абонемента: чекбокс заблокирован, тап ведёт в оформление. */
  gated: boolean
  /** Отмечен без абонемента (легаси-данные) — warning-чип. */
  legacyWarn: boolean
  subLine?: ReactNode
  onToggle: () => void
  onIssue: () => void
}

export function MarkStudentRow({
  name,
  status,
  checked,
  gated,
  legacyWarn,
  subLine,
  onToggle,
  onIssue,
}: MarkStudentRowProps) {
  const { t } = useTranslation()
  const handleGated = (e: React.MouseEvent) => {
    e.preventDefault()
    onIssue()
  }
  const handleIssueBtn = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onIssue()
  }
  return (
    <label
      className={`mark-row${checked ? ' mark-row--checked' : ''}${gated ? ' mark-row--gated' : ''}`}
      onClick={gated ? handleGated : undefined}
    >
      <Checkbox checked={checked} disabled={gated} onChange={onToggle} />
      <div className="mark-row__info">
        <span className="mark-row__name">{name}</span>
        {subLine && <span className="mark-row__sub">{subLine}</span>}
        {legacyWarn && (
          <span className="mark-row__warn">
            <ExclamationCircleOutlined /> {t('trainings.cal.markedNoSub')}
          </span>
        )}
      </div>
      <StatusBadge status={status} />
      {gated && (
        <Button size="small" onClick={handleIssueBtn}>
          {t('trainings.cal.issueSub')}
        </Button>
      )}
    </label>
  )
}
```

Проверить экспорт типа `SubStatus` из `entities/students` (используется в subscription-status.ts); при отсутствии — реэкспортировать.

- [ ] **Step 3: `quick-mark-sheet.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from 'antd'
import { CheckOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet } from 'common/ui'
import { usePricingRules } from 'entities/finance/api/use-finance'
import { getSubStatus, subTypeLabel } from 'entities/students'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'
import { useGroups } from 'entities/groups'

import { previewBilling } from './billing-preview'
import { indKey } from './day-marking-model'
import { MarkStudentRow } from './mark-student-row'
import { needsSub, useDayMarking } from './use-day-marking'

import './quick-mark-sheet.scss'
import './mark-today-modal.scss'

/** Что отмечаем: групповое — по имени группы, инд./парное — по trainingId. */
export interface QuickMarkTarget {
  groupId: string
  trainingId: string | null
  isInd: boolean
  time: string
  label: string
  date: string
}

interface IssueTarget {
  studentId: string
  name: string
  groupId: string
  trainingId?: string
}

interface QuickMarkSheetProps {
  target: QuickMarkTarget | null
  onClose: () => void
}

export function QuickMarkSheet({ target, onClose }: QuickMarkSheetProps) {
  const { t } = useTranslation()
  const open = !!target
  const date = target?.date ?? ''
  const {
    dayGroups,
    dayIndividuals,
    students,
    trainings,
    checks,
    indChecks,
    toggle,
    toggleInd,
    initChecks,
    save,
    saving,
  } = useDayMarking(open, onClose, date)
  const { data: groups = [] } = useGroups()
  const [issueFor, setIssueFor] = useState<IssueTarget | null>(null)

  // Срез дня под одно занятие: группа по имени, инд./парное по trainingId.
  const slotGroup = target && !target.isInd
    ? dayGroups.find((g) => g.groupId === target.groupId) ?? null
    : null
  const slotInd = target?.isInd
    ? dayIndividuals.filter((i) => i.trainingId === target.trainingId)
    : []

  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      return
    }
    if (!inited.current && (slotGroup || slotInd.length > 0)) {
      initChecks()
      inited.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotGroup, slotInd])

  const group = groups.find((g) => g.name === target?.groupId) ?? null
  const { data: rules = [] } = usePricingRules(group?.locationId ?? '')

  const groupMembers = useMemo(
    () => (slotGroup ? students.filter((s) => s.groups.includes(slotGroup.groupId)) : []),
    [students, slotGroup],
  )

  // Инд./парная тренировка среза — для isPair и длительности.
  const indTraining = target?.isInd
    ? trainings.find((tr) => tr.id === target.trainingId) ?? null
    : null

  const billingLine = (studentId: string, isPair: boolean, duration: number) => {
    const st = students.find((s) => s.id === studentId)
    if (!st || !target) return null
    const preview = previewBilling({
      student: st,
      groupId: target.groupId,
      isPair,
      isPrime: false,
      sessionDuration: duration,
      rules,
    })
    if (preview.kind === 'subscription')
      return t('home.billingSub', { count: preview.remaining })
    if (preview.kind === 'payment')
      return preview.amount === null
        ? t('home.billingNoTariff')
        : t('home.billingPayment', { amount: preview.amount })
    return null
  }

  const checkedCount = slotGroup
    ? (checks[slotGroup.groupId]?.size ?? 0)
    : slotInd.filter((i) => indChecks[indKey(i.trainingId, i.studentId)]).length
  const totalCount = slotGroup ? groupMembers.length : slotInd.length

  const handleSave = () => {
    if (!target) return
    // Сохраняем ТОЛЬКО срез этого занятия — остальной день не трогаем.
    if (slotGroup) {
      save({ groups: { [slotGroup.groupId]: checks[slotGroup.groupId] ?? new Set() }, ind: {} })
    } else {
      const ind: Record<string, boolean> = {}
      for (const i of slotInd) {
        const key = indKey(i.trainingId, i.studentId)
        ind[key] = indChecks[key] ?? i.originalPresent
      }
      save({ groups: {}, ind })
    }
  }

  const handleIssued = () => {
    if (!issueFor) return
    if (issueFor.trainingId) toggleInd(issueFor.trainingId, issueFor.studentId)
    else toggle(issueFor.groupId, issueFor.studentId)
  }

  return (
    <>
      <AdaptiveSheet
        open={open}
        title={target ? `${target.label} · ${target.time}` : ''}
        onClose={onClose}
        footer={
          <Button
            className="tk-btn-primary"
            type="primary"
            block
            loading={saving}
            onClick={handleSave}
          >
            <CheckOutlined />{' '}
            {t('home.quickMarkDone', { checked: checkedCount, total: totalCount })}
          </Button>
        }
      >
        <div className="quick-mark">
          {slotGroup &&
            groupMembers.map((s) => {
              const st = getSubStatus(s, slotGroup.groupId, slotGroup.duration)
              const checked = checks[slotGroup.groupId]?.has(s.id) ?? false
              const gated = needsSub(st.type) && !checked
              return (
                <MarkStudentRow
                  key={s.id}
                  name={s.name}
                  status={st}
                  checked={checked}
                  gated={gated}
                  legacyWarn={needsSub(st.type) && checked}
                  subLine={billingLine(s.id, false, slotGroup.duration)}
                  onToggle={() => toggle(slotGroup.groupId, s.id)}
                  onIssue={() =>
                    setIssueFor({ studentId: s.id, name: s.name, groupId: slotGroup.groupId })
                  }
                />
              )
            })}
          {slotInd.map((i) => {
            const st = students.find((s) => s.id === i.studentId)
            if (!st || !target) return null
            const status = getSubStatus(st, i.groupId)
            const checked = indChecks[indKey(i.trainingId, i.studentId)] ?? i.originalPresent
            const gated = needsSub(status.type) && !checked
            return (
              <MarkStudentRow
                key={indKey(i.trainingId, i.studentId)}
                name={st.name}
                status={status}
                checked={checked}
                gated={gated}
                legacyWarn={needsSub(status.type) && checked}
                subLine={billingLine(
                  i.studentId,
                  indTraining?.isPair ?? false,
                  indTraining?.sessionDuration ?? 60,
                )}
                onToggle={() => toggleInd(i.trainingId, i.studentId)}
                onIssue={() =>
                  setIssueFor({
                    studentId: i.studentId,
                    name: st.name,
                    groupId: i.groupId,
                    trainingId: i.trainingId,
                  })
                }
              />
            )
          })}
        </div>
      </AdaptiveSheet>
      {issueFor && (
        <RenewSubModal
          open
          issueMode
          studentId={issueFor.studentId}
          studentName={issueFor.name}
          groupId={issueFor.groupId}
          onCreated={handleIssued}
          onClose={() => setIssueFor(null)}
        />
      )}
    </>
  )
}
```

Замечание исполнителю: порядок импортов поправит `npx eslint src --fix` (simple-import-sort).

- [ ] **Step 4: `quick-mark-sheet.scss`**

```scss
.quick-mark {
  display: flex;
  flex-direction: column;

  /* Крупные зоны тапа на мобиле: строка не ниже 44px. */
  .mark-row {
    min-height: 44px;
  }
}
```

- [ ] **Step 5: Гейты**

Run: `npm run build -w apps/frontend && npm test -w apps/frontend`, затем eslint `--fix` + проверка 0/0. Компонент пока никуда не врезан — это следующая задача.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/home apps/frontend/src/locales
git commit -m "feat(frontend): QuickMarkSheet — отметка одного занятия в шторке с превью биллинга"
```

---

### Task 8: кнопка «Отметить» в ленте дня + интеграция QuickMarkSheet

**Files:**
- Modify: `apps/frontend/src/pages/home/today-agenda.tsx`
- Modify: `apps/frontend/src/pages/home/today-agenda.scss`
- Modify: `apps/frontend/src/pages/home/home-page.tsx`

- [ ] **Step 1: today-agenda — строка из `<button>` в `<div role="button">`**

Внутри строки появится antd-кнопка, а `<button>` в `<button>` — невалидный HTML. В `renderRow` заменить обёртку:

```tsx
    return (
      <div
        role="button"
        tabIndex={0}
        key={it.block.key}
        className={cls}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick()
        }}
      >
        ...содержимое без изменений...
      </div>
    )
```

В `today-agenda.scss` убедиться, что у `.agenda__row` есть `cursor: pointer` (был у button по умолчанию — добавить явно) и не сломались reset-стили кнопки (если были `border: none; background: none` — оставить, для div они безвредны).

- [ ] **Step 2: кнопка «Отметить»**

Пропсы компонента дополнить `onQuickMark: (block: CalendarBlock) => void`. В `renderRow` правый край строки:

```tsx
        {done ? (
          <CheckOutlined className="agenda__check" />
        ) : needsMark(it, nowMin) ? (
          <Button
            size="small"
            className="tk-btn-primary agenda__mark"
            onClick={(e) => {
              e.stopPropagation()
              onQuickMark(it.block)
            }}
          >
            {t('home.quickMark')}
          </Button>
        ) : (
          <RightOutlined className="agenda__chevron" />
        )}
```

Импортировать `needsMark` из `./agenda-model` и `Button` из antd. В scss:

```scss
.agenda__mark {
  flex: none;
}
```

- [ ] **Step 3: home-page — состояние и рендер шторки**

```tsx
import { QuickMarkSheet } from './quick-mark-sheet'
import { todayISO } from 'common/utils/date'

import type { QuickMarkTarget } from './quick-mark-sheet'
```

```tsx
  const [quickMark, setQuickMark] = useState<QuickMarkTarget | null>(null)
  const handleQuickMark = (block: CalendarBlock) =>
    setQuickMark({
      groupId: block.groupId,
      trainingId: block.trainingId,
      isInd: block.isInd,
      time: block.time,
      label: block.label,
      date: todayISO(),
    })
```

Передать в `<TodayAgenda ... onQuickMark={handleQuickMark} />`, а рядом с другими модалками:

```tsx
      <QuickMarkSheet target={quickMark} onClose={() => setQuickMark(null)} />
```

- [ ] **Step 4: Гейты + ручная проверка**

Run: сборка + тесты + eslint. Вручную: на главной у прошедшего неотмеченного занятия — кнопка «Отметить»; тап открывает шторку с предотмеченными; «Готово» отмечает, строка получает ✓; на мобильной ширине (≤768) — нижняя шторка.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/home
git commit -m "feat(frontend): кнопка «Отметить» в ленте дня → QuickMarkSheet"
```

---

### Task 9: `CloseDaySheet` + сигнал «вчера не отмечено»

**Files:**
- Create: `apps/frontend/src/pages/home/close-day-sheet.tsx`
- Create: `apps/frontend/src/pages/home/close-day-sheet.scss`
- Delete: `apps/frontend/src/pages/home/mark-today-modal.tsx`, `mark-today-modal.scss` — НО: классы `mark-row*` из `mark-today-modal.scss` нужны `MarkStudentRow`; перенести их в новый файл `apps/frontend/src/pages/home/mark-student-row.scss`, импортировать из `mark-student-row.tsx`, и только потом удалить старые файлы (поправить импорт scss в `quick-mark-sheet.tsx`).
- Modify: `apps/frontend/src/pages/home/use-home-page.ts`, `home-page.tsx`, локали.

- [ ] **Step 1: i18n-ключи** (`home` в ru):

```json
"closeDayTitle": "Закрыть день · {{date}}",
"closeDayAlreadyMarked": "уже отмечено",
"closeDayWillMark": "придут: {{count}}",
"closeDayNobody": "некого отмечать",
"closeDayMarkAll": "Отметить всё",
"closeDayExpandHint": "точечно поправить — тап по занятию",
"peopleCount_one": "{{count}} человек",
"peopleCount_few": "{{count}} человека",
"peopleCount_many": "{{count}} человек",
"attentionYesterday": "Вчера не отмечено: {{count}}",
"closeYesterdayBtn": "Закрыть день"
```

en:

```json
"closeDayTitle": "Close the day · {{date}}",
"closeDayAlreadyMarked": "already marked",
"closeDayWillMark": "expected: {{count}}",
"closeDayNobody": "no one to mark",
"closeDayMarkAll": "Mark all",
"closeDayExpandHint": "tap a session to fine-tune",
"peopleCount_one": "{{count}} person",
"peopleCount_other": "{{count}} people",
"attentionYesterday": "Yesterday unmarked: {{count}}",
"closeYesterdayBtn": "Close the day"
```

(`home.trainingsCount*` плюрал уже существует — переиспользовать для «N занятий».)

- [ ] **Step 2: `close-day-sheet.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Checkbox } from 'antd'
import { CheckOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { getSubStatus } from 'entities/students'

import { closeDaySummary, defaultGroupChecks, defaultIndChecks, indKey } from './day-marking-model'
import { QuickMarkSheet } from './quick-mark-sheet'
import { needsSub, useDayMarking } from './use-day-marking'

import type { QuickMarkTarget } from './quick-mark-sheet'
import type { MarkSelection } from './use-day-marking'

import './close-day-sheet.scss'

interface CloseDaySheetProps {
  open: boolean
  date: string
  onClose: () => void
}

interface Row {
  key: string
  label: string
  time: string
  alreadyMarked: boolean
  willMark: number
  target: QuickMarkTarget
  /** Дефолтный выбор строки — то, что сохранится при галочке «как запланировано». */
  groupChecks?: Set<string>
  indChecks?: Record<string, boolean>
}

export function CloseDaySheet({ open, date, onClose }: CloseDaySheetProps) {
  const { t } = useTranslation()
  const day = useDayMarking(open, onClose, date)
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set())
  const [expand, setExpand] = useState<QuickMarkTarget | null>(null)

  // Строки: занятие целиком + дефолт «как запланировано» из чистой модели.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const dg of day.dayGroups) {
      const members = day.students.filter((s) => s.groups.includes(dg.groupId))
      const def = defaultGroupChecks(
        { existing: dg.existing },
        members,
        (s) => !needsSub(getSubStatus(s, dg.groupId, dg.duration).type),
      )
      const willMark = [...def].filter((id) => !dg.originalAttendees.has(id)).length
      out.push({
        key: `g:${dg.groupId}`,
        label: dg.groupId,
        time: dg.time,
        alreadyMarked: dg.originalAttendees.size > 0,
        willMark,
        groupChecks: def,
        target: {
          groupId: dg.groupId,
          trainingId: dg.existing?.id ?? null,
          isInd: false,
          time: dg.time,
          label: dg.groupId,
          date,
        },
      })
    }
    // Инд./парные группируются по trainingId (у парного 2 строки слота → 1 занятие).
    const byTraining = new Map<string, typeof day.dayIndividuals>()
    for (const ti of day.dayIndividuals) {
      const arr = byTraining.get(ti.trainingId) ?? []
      arr.push(ti)
      byTraining.set(ti.trainingId, arr)
    }
    for (const [trainingId, slots] of byTraining) {
      const def = defaultIndChecks(slots, (slot) => {
        const st = day.students.find((s) => s.id === slot.studentId)
        return !!st && !needsSub(getSubStatus(st, slot.groupId).type)
      })
      const willMark = slots.filter(
        (s) => !s.originalPresent && def[indKey(s.trainingId, s.studentId)],
      ).length
      const names = slots
        .map((s) => day.students.find((st) => st.id === s.studentId)?.name ?? '')
        .filter(Boolean)
        .join(' + ')
      out.push({
        key: `t:${trainingId}`,
        label: names || t('home.indTraining'),
        time: slots[0]?.time ?? '',
        alreadyMarked: slots.every((s) => s.originalPresent),
        willMark,
        indChecks: def,
        target: {
          groupId: slots[0]?.groupId ?? '',
          trainingId,
          isInd: true,
          time: slots[0]?.time ?? '',
          label: names || t('home.indTraining'),
          date,
        },
      })
    }
    return out.sort((a, b) => a.time.localeCompare(b.time))
  }, [day.dayGroups, day.dayIndividuals, day.students, date, t])

  // Сид галочек строк: один раз на открытие, по умолчанию все незакрытые включены.
  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      return
    }
    if (!inited.current && rows.length > 0) {
      setCheckedRows(new Set(rows.filter((r) => !r.alreadyMarked && r.willMark > 0).map((r) => r.key)))
      inited.current = true
    }
  }, [open, rows])

  const toggleRow = (key: string) =>
    setCheckedRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const summary = closeDaySummary(rows, checkedRows)

  const handleSave = () => {
    // Явный выбор: только выбранные строки, их дефолтные участники.
    const selection: MarkSelection = { groups: {}, ind: {} }
    for (const r of rows) {
      if (r.alreadyMarked || !checkedRows.has(r.key)) continue
      if (r.groupChecks) selection.groups[r.target.groupId] = r.groupChecks
      if (r.indChecks) Object.assign(selection.ind, r.indChecks)
    }
    day.save(selection)
  }

  return (
    <>
      <AdaptiveSheet
        open={open}
        title={t('home.closeDayTitle', { date: formatDateShort(date) })}
        onClose={onClose}
        footer={
          rows.length > 0 ? (
            <div className="close-day__footer">
              <Button
                className="tk-btn-primary"
                type="primary"
                block
                loading={day.saving}
                disabled={summary.trainings === 0}
                onClick={handleSave}
              >
                <CheckOutlined /> {t('home.closeDayMarkAll')}
                {summary.trainings > 0 &&
                  ` · ${t('home.trainingsCount', { count: summary.trainings })}, ${t('home.peopleCount', { count: summary.students })}`}
              </Button>
              <div className="close-day__hint">{t('home.closeDayExpandHint')}</div>
            </div>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <p className="mark-empty">{t('home.markTodayModal.nothingScheduled')}</p>
        ) : (
          <div className="close-day">
            {rows.map((r) => (
              <div
                role="button"
                tabIndex={0}
                key={r.key}
                className={`close-day__row${r.alreadyMarked ? ' close-day__row--done' : ''}`}
                onClick={() => setExpand(r.target)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setExpand(r.target)
                }}
              >
                <span className="close-day__time tk-num">{r.time}</span>
                <span className="close-day__main">
                  <span className="close-day__name">{r.label}</span>
                  <span className="close-day__sub">
                    {r.alreadyMarked ? (
                      <>
                        <CheckOutlined /> {t('home.closeDayAlreadyMarked')}
                      </>
                    ) : r.willMark > 0 ? (
                      t('home.closeDayWillMark', { count: r.willMark })
                    ) : (
                      t('home.closeDayNobody')
                    )}
                  </span>
                </span>
                {!r.alreadyMarked && (
                  <Checkbox
                    checked={checkedRows.has(r.key)}
                    disabled={r.willMark === 0}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleRow(r.key)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </AdaptiveSheet>
      <QuickMarkSheet target={expand} onClose={() => setExpand(null)} />
    </>
  )
}
```

Ключ `home.markTodayModal.nothingScheduled` существует (из старой модалки) — НЕ удалять его из локалей; остальные `home.markTodayModal.*`, оставшиеся без использования, удалить из ru/en (проверить grep'ом по `markTodayModal.`).

- [ ] **Step 3: `close-day-sheet.scss`**

```scss
.close-day {
  display: flex;
  flex-direction: column;

  &__row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    min-height: 48px;
    padding: var(--sp-2) var(--sp-2);
    border-bottom: 1px solid var(--tk-border-default);
    cursor: pointer;

    &--done {
      opacity: 0.55;
    }
  }

  &__time {
    color: var(--tk-text-secondary);
    flex: none;
    width: 44px;
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sub {
    font-size: var(--tk-fs-caption);
    color: var(--tk-text-tertiary);
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  &__hint {
    text-align: center;
    font-size: var(--tk-fs-caption);
    color: var(--tk-text-tertiary);
  }
}

.mark-empty {
  color: var(--tk-text-secondary);
  text-align: center;
  padding: var(--sp-4) 0;
}
```

(Сверить имена токенов отступов `--sp-*` с легаси `tokens.scss` — там геометрия; использовать те же, что в соседних scss главной.)

- [ ] **Step 4: перенос `mark-row*`-стилей**

Создать `mark-student-row.scss`, перенести из `mark-today-modal.scss` все правила `.mark-row*` (и только их), импортировать в `mark-student-row.tsx` (`import './mark-student-row.scss'`). Из `quick-mark-sheet.tsx` убрать `import './mark-today-modal.scss'`. Удалить `mark-today-modal.tsx` и `mark-today-modal.scss`:

```bash
git rm apps/frontend/src/pages/home/mark-today-modal.tsx apps/frontend/src/pages/home/mark-today-modal.scss
```

- [ ] **Step 5: home-page + use-home-page**

`use-home-page.ts` — добавить рядом с `agendaBlocks`:

```ts
  const yest = yesterdayISO()
  const yesterdayUnmarked = useMemo(
    () =>
      buildCalendarDay(yest, trainings, students, groups).day.blocks.filter(
        (b) => b.attendeesCount === 0,
      ).length,
    [yest, trainings, students, groups],
  )
```

(импорт `yesterdayISO` из `common/utils/date`; вернуть `yesterdayUnmarked` из хука).

`home-page.tsx`:
- заменить `MarkTodayModal` на `CloseDaySheet`: состояние `page.markTodayOpen` остаётся, плюс новое `const [closeDate, setCloseDate] = useState(todayISO())`; кнопка «Отметить день» → `setCloseDate(todayISO()); page.setMarkTodayOpen(true)`.
- рендер: `<CloseDaySheet open={page.markTodayOpen} date={closeDate} onClose={handleCloseMarkToday} />`.
- сигнал «вчера» в колонке «Требует внимания» **после истёкших абонементов и до неоплаченных** (порядок серьёзности по спеке §2.4: истёкшие → вчера → неоплаченные → заканчивающиеся), т.е. между `page.warnings.filter(expired)` и блоком `unpaid.map(...)`:

```tsx
              {page.yesterdayUnmarked > 0 && (
                <WarningItem
                  name={t('home.attentionYesterday', { count: page.yesterdayUnmarked })}
                  detail=""
                  danger={false}
                  onClick={() => {
                    setCloseDate(yesterdayISO())
                    page.setMarkTodayOpen(true)
                  }}
                  action={
                    <Button
                      className="tk-btn-secondary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCloseDate(yesterdayISO())
                        page.setMarkTodayOpen(true)
                      }}
                    >
                      {t('home.closeYesterdayBtn')}
                    </Button>
                  }
                />
              )}
```

Также условие заголовка колонки (`page.warnings.length || unpaid.length`) дополнить `|| page.yesterdayUnmarked > 0`. Сверить пропсы `WarningItem` (name/detail/danger/onClick/action) с `common/ui/warning-item` — при расхождении адаптировать.

- [ ] **Step 6: Гейты + ручная проверка**

Сборка, тесты, eslint 0/0. Вручную: «Отметить день» → шторка с занятиями дня, галочки у незакрытых, сводка в кнопке; тап по строке раскрывает участников; «Отметить всё» закрывает день; при неотмеченном вчера — сигнал в колонке, тап открывает вчерашний день.

- [ ] **Step 7: Commit**

```bash
git add -A apps/frontend/src
git commit -m "feat(frontend): CloseDaySheet — пакетное закрытие дня + сигнал «вчера не отмечено»"
```

---

### Task 10: продление в один экран (prefill + «Оплачен сразу»)

**Files:**
- Modify: `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx`
- Modify: локали ru/en

- [ ] **Step 1: i18n-ключи** (`subscriptions.renew` в ru):

```json
"paidNow": "Оплачен сразу",
"paidNowHint": "создастся платёж {{amount}} ₽",
"priceLine": "{{label}} · {{amount}} ₽"
```

en:

```json
"paidNow": "Paid now",
"paidNowHint": "a payment of {{amount}} ₽ will be created",
"priceLine": "{{label}} · {{amount}} ₽"
```

- [ ] **Step 2: переработка `renew-sub-modal.tsx`**

Изменения относительно текущего файла (см. его целиком в репо):

1. **prevSub на уровне рендера** (для префилла типа и слота):

```ts
  const group = groups.find((g) => g.id === groupId) ?? null
  const groupName = group?.name ?? groupId
  const prevSub = useMemo(() => {
    const subs = students.find((s) => s.id === studentId)?.subscriptions ?? []
    return (
      [...subs]
        .filter((s) => s.groupId === groupName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    )
  }, [students, studentId, groupName])
```

2. **Тип по умолчанию — как у прошлого абонемента** (паттерн «adjust state during render», как в mark-paid-modal):

```ts
  const [type, setType] = useState<SubscriptionType>(prevSub?.type ?? '8')
  const [seededFor, setSeededFor] = useState(prevSub?.id)
  if (seededFor !== prevSub?.id) {
    setSeededFor(prevSub?.id)
    setType(prevSub?.type ?? '8')
  }
```

(Если `prevSub.type` бывает '1_90' и пр., а опций три ('1','4','8') — нормализовать: `const baseType = (prevSub?.type ?? '8').replace('_90', '').replace('_pair', '') as SubscriptionType`, и в Select добавить недостающие опции НЕ нужно — нормализация к базовым трём.)

3. **Цена выбранного типа** (живой пересчёт):

```ts
  const { data: priceRule } = useQuery({
    queryKey: ['renew-price', groupId, type],
    queryFn: () =>
      resolvePricingRule(group?.locationId ?? null, subTypeToTuple(type, group?.isIndividual ?? false)),
    enabled: open,
  })
  const slot = prevSub?.timeSlot ?? 'regular'
  const price = priceRule?.rule
    ? slot === 'prime'
      ? priceRule.rule.client_prime_price
      : priceRule.rule.client_price
    : null
```

Показ под Select типа:

```tsx
        {price !== null && (
          <div style={{ color: 'var(--tk-text-secondary)', fontSize: 'var(--tk-fs-small)', marginTop: 'calc(-1 * var(--sp-2))', marginBottom: 'var(--sp-3)' }}>
            {t('subscriptions.renew.priceLine', { label: t(`students.subTypes.${type}`, { defaultValue: type }), amount: price })}
          </div>
        )}
```

4. **Переключатель «Оплачен сразу»** (default ON — по утверждённому мокапу):

```ts
  const [paidNow, setPaidNow] = useState(true)
```

```tsx
        <Form.Item>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Switch checked={paidNow} onChange={setPaidNow} />
            <span>
              {t('subscriptions.renew.paidNow')}
              {paidNow && price !== null && (
                <span style={{ display: 'block', color: 'var(--tk-text-tertiary)', fontSize: 'var(--tk-fs-caption)' }}>
                  {t('subscriptions.renew.paidNowHint', { amount: price })}
                </span>
              )}
            </span>
          </div>
        </Form.Item>
```

5. **submit — оплата по паттерну add-sub-modal** (после `addSubscription.mutateAsync`, который надо взять в переменную):

```ts
    const createdSub = await addSubscription.mutateAsync({ ... как сейчас ... })
    if (paidNow && createdSub) {
      const fin = await autoCreatePayment(
        studentId,
        { id: createdSub.id, type, createdAt: date },
        group?.isIndividual ?? false,
        { isPrime: slot === 'prime', locationId: group?.locationId ?? null },
      )
      if (fin) await linkPaymentToSub(studentId, createdSub.id, fin.paymentId)
      else toast({ type: 'warn', title: t('finance.autoRecord.noTariff') })
    }
```

Импорты: `autoCreatePayment` из `entities/finance` (реэкспортирован в index), `linkPaymentToSub` из `entities/students/model/students.repo`, `Switch` из antd, `useQuery` из `@tanstack/react-query`, `useMemo` из react.

6. **Modal → AdaptiveSheet**: заменить обёртку `<Modal open title onCancel footer>` на `<AdaptiveSheet open title onClose footer>` (footer — те же кнопки; импорт `AdaptiveSheet` из `common/ui`, импорт `Modal` убрать).

- [ ] **Step 3: Гейты + ручная проверка**

Сборка, тесты, eslint. Вручную: «Продлить» из «Требует внимания» — тип предзаполнен прошлым абонементом, под ним цена; свитч «Оплачен сразу» включён; «Продлить» создаёт абонемент + платёж (виден в Финансах, абонемент НЕ в «Ожидают оплаты»); со свитчем OFF — абонемент попадает в «Ожидают оплаты» (старое поведение). `issueMode` (оформление из гейта) работает как раньше.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx apps/frontend/src/locales
git commit -m "feat(frontend): продление в один экран — префилл типа, цена, «Оплачен сразу»"
```

---

### Task 11: MarkPaidModal → AdaptiveSheet

**Files:**
- Modify: `apps/frontend/src/entities/finance/form/mark-paid-modal.tsx`

- [ ] **Step 1: Заменить обёртку**

`<Modal open={open} title={...} onCancel={onClose} destroyOnHidden footer={[...]}>` → `<AdaptiveSheet open={open} title={t('finance.markPaid.title')} onClose={onClose} footer={<>{кнопки}</>}>`. Контент и логика не меняются (всё уже предзаполнено: сумма/зал из тарифа по слоту абонемента, дата). Импорт `AdaptiveSheet` из `common/ui`, `Modal` из импортов antd убрать.

- [ ] **Step 2: Гейты + ручная проверка**

Сборка, тесты, eslint. Вручную: «Записать оплату» с главной и из дровера ученика — на десктопе модалка, на мобиле нижняя шторка; сохранение работает.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/entities/finance/form/mark-paid-modal.tsx
git commit -m "feat(frontend): MarkPaidModal в адаптивной шторке"
```

---

### Task 12: финальные гейты, доки, мерж-готовность

**Files:**
- Modify: `docs/ARCHITECTURE.md`, `docs/superpowers/specs/2026-06-13-my-day-quick-actions-design.md`

- [ ] **Step 1: Полный прогон гейтов**

```bash
npm run build -w apps/frontend
npm run build -w apps/backend
npm test -w apps/backend        # 58 jest — не должны быть задеты
npm test -w apps/frontend       # новые vitest
cd apps/frontend && npx eslint src   # 0 errors / 0 warnings
```

- [ ] **Step 2: Сквозная ручная проверка** (бэк `npm run start:dev -w apps/backend`, фронт `npm run dev`, demo@trikick.ru/demo1234):

1. Лента: «Отметить» на прошедшем → шторка, все предотмечены, биллинг-подписи верные («спишется · осталось N» / гейт «Оформить»), снять одного → «Готово · N−1 из N» → сохранено, тост.
2. Снятие отметки: повторно открыть то же занятие, снять галочку → визит откатился (деньги в Финансах вернулись).
3. «Отметить день» → строки занятий, сводка, «Отметить всё»; точечная правка тапом.
4. Вчера: снять отметку с вчерашнего занятия в календаре → на главной сигнал «Вчера не отмечено: 1» → закрыть.
5. Продление с «Оплачен сразу» ON и OFF (см. Task 10 Step 3).
6. Мобильная ширина 390px: все четыре поверхности — нижние шторки, зоны тапа ≥44px.
7. Светлая тема — спот-чек шторок.

- [ ] **Step 3: Обновить доки**

- `docs/ARCHITECTURE.md`: §4 — упомянуть `common/ui/adaptive-sheet`, `pages/home` (quick-mark/close-day/billing-preview/day-marking-model); §9 «Запуск» — добавить гейт `npm test -w apps/frontend` (vitest); §7 — строка фичи «Мой день» с датой.
- Спека `2026-06-13-my-day-quick-actions-design.md`: в таблице компонентов путь `QuickMarkSheet` исправить с `entities/trainings/quick-mark-sheet` на `pages/home/quick-mark-sheet` (компонент зависит от students/finance — слой pages корректнее).

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs: ARCHITECTURE + спека — фича «Мой день», vitest-гейт"
```

- [ ] **Step 5: Финиш ветки**

Использовать скилл superpowers:finishing-a-development-branch (варианты: мерж в `main` + push, как обычно в этом проекте — после подтверждения пользователем).

---

## Самопроверка покрытия спеки

| Требование спеки | Задача |
|---|---|
| 2.1 Быстрая отметка из ленты, предотметка, биллинг-превью, «Готово · N из M» | T2, T5, T7, T8 |
| 2.2 «Закрыть день», галочка на занятие, раскрытие, любая дата | T4, T6, T9 |
| 2.3 Продление prefill + «оплачен сразу»; оплата prefill | T10, T11 |
| 2.4 Сигнал «вчера не отмечено» | T2 (yesterdayISO), T9 |
| 2.5 AdaptiveSheet, токены, subtle-accent | T3 + все UI-задачи |
| 3 Бэкенд не меняется, превью≠факт, дефолт «все пришли» | T5, T6 |
| 5 Ошибки: тост+инвалидация, noTariff | T6 (сохранён паттерн) |
| 6 Тесты чистых функций, гейты, i18n ru/en | T1, T2, T4, T5, ключи в задачах |
