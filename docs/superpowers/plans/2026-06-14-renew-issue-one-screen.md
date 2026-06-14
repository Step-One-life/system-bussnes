# Продление/оформление абонемента «в один экран» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переписать модалку `RenewSubModal` под утверждённый макет «3а · Продление в один экран»: компактные строки, заголовок с именем и группой, плашка «Как прошлый», быстрый выбор «Начало», «Оплачен сразу» с подписью; убрать выбор типа.

**Architecture:** Логика создания абонемента и авто-платежа сохраняется. Меняется только подача (вёрстка) и убираются поля выбора типа. Тип абонемента фиксируется: продление — «как прошлый», оформление — разовое (`'1'`). Тип тренировки (`lessonKind`) выводится из группы автоматически. Дата начала — быстрый выбор Сегодня/Завтра/Дата через чистую функцию.

**Tech Stack:** React + antd + react-query + i18next; тесты — vitest (фронт, `.spec.ts` рядом с кодом).

---

## Файловая структура

| Файл | Ответственность |
|---|---|
| `apps/frontend/src/common/utils/date.ts` | + `tomorrowISO()` рядом с `todayISO/yesterdayISO`. |
| `apps/frontend/src/common/utils/date.spec.ts` | Новый: тест `tomorrowISO`. |
| `apps/frontend/src/entities/students/subscriptions/renew-date.ts` | Новый: тип `StartMode` + чистая `resolveStartDate`. |
| `apps/frontend/src/entities/students/subscriptions/renew-date.spec.ts` | Новый: тесты `resolveStartDate`. |
| `apps/frontend/src/locales/ru/translation.json` | Новые ключи (заголовки, плашка, «Начало», варианты дат). |
| `apps/frontend/src/locales/en/translation.json` | Те же ключи (en). |
| `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx` | Переписать вёрстку, убрать Select/Form, добавить быстрый выбор даты, дефолт `'1'`. |
| `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.scss` | Новый: стили строк-плашек на токенах `--tk-`. |

---

## Task 1: Хелпер `tomorrowISO`

**Files:**
- Modify: `apps/frontend/src/common/utils/date.ts` (после `yesterdayISO`, ~строка 72)
- Test: `apps/frontend/src/common/utils/date.spec.ts` (создать)

- [ ] **Step 1: Написать падающий тест**

Создать `apps/frontend/src/common/utils/date.spec.ts`:

```ts
import { todayISO, tomorrowISO } from './date'

import dayjs from 'dayjs'

import { describe, expect, it } from 'vitest'

describe('tomorrowISO', () => {
  it('на один день больше, чем todayISO', () => {
    expect(dayjs(tomorrowISO()).diff(dayjs(todayISO()), 'day')).toBe(1)
  })

  it('формат YYYY-MM-DD', () => {
    expect(tomorrowISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -w apps/frontend -- date.spec`
Expected: FAIL — `tomorrowISO is not a function` / не экспортирован.

- [ ] **Step 3: Реализация**

В `apps/frontend/src/common/utils/date.ts` добавить после `yesterdayISO()`:

```ts
/** Tomorrow's local calendar date as YYYY-MM-DD. */
export function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return toLocalISODate(d)
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -w apps/frontend -- date.spec`
Expected: PASS (2 теста).

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/common/utils/date.ts apps/frontend/src/common/utils/date.spec.ts
git commit -m "feat(frontend): хелпер tomorrowISO"
```

---

## Task 2: Чистая функция `resolveStartDate`

**Files:**
- Create: `apps/frontend/src/entities/students/subscriptions/renew-date.ts`
- Test: `apps/frontend/src/entities/students/subscriptions/renew-date.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `renew-date.spec.ts`:

```ts
import { resolveStartDate } from './renew-date'

import { describe, expect, it } from 'vitest'

describe('resolveStartDate', () => {
  const today = '2026-06-14'
  const tomorrow = '2026-06-15'
  const custom = '2026-07-01'

  it('today → сегодня', () => {
    expect(resolveStartDate('today', today, tomorrow, custom)).toBe(today)
  })

  it('tomorrow → завтра', () => {
    expect(resolveStartDate('tomorrow', today, tomorrow, custom)).toBe(tomorrow)
  })

  it('custom → выбранная дата', () => {
    expect(resolveStartDate('custom', today, tomorrow, custom)).toBe(custom)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -w apps/frontend -- renew-date.spec`
Expected: FAIL — модуль `./renew-date` не найден.

- [ ] **Step 3: Реализация**

Создать `renew-date.ts`:

```ts
/** Режим выбора начала абонемента в модалке продления/оформления. */
export type StartMode = 'today' | 'tomorrow' | 'custom'

/** Итоговая ISO-дата начала из выбранного режима (чистая функция). */
export function resolveStartDate(
  mode: StartMode,
  today: string,
  tomorrow: string,
  custom: string,
): string {
  if (mode === 'tomorrow') return tomorrow
  if (mode === 'custom') return custom
  return today
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -w apps/frontend -- renew-date.spec`
Expected: PASS (3 теста).

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/entities/students/subscriptions/renew-date.ts apps/frontend/src/entities/students/subscriptions/renew-date.spec.ts
git commit -m "feat(frontend): resolveStartDate — чистый выбор начала абонемента"
```

---

## Task 3: Ключи локалей (ru/en)

**Files:**
- Modify: `apps/frontend/src/locales/ru/translation.json` (объект `subscriptions.renew` ~строки 219-229, `subscriptions.issue` ~230-234)
- Modify: `apps/frontend/src/locales/en/translation.json` (те же объекты)

- [ ] **Step 1: Добавить ключи в ru**

В объект `subscriptions.renew` (после существующего `priceLine`) добавить новые ключи (НЕ удаляя старые), и `titleWith`:

```json
"renew": {
  "title": "Продлить абонемент",
  "titleWith": "Продлить: {{name}} · «{{group}}»",
  "subRenewed": "Абонемент продлён",
  "student": "Ученик:",
  "group": "Группа:",
  "typeLabel": "Тип абонемента",
  "dateLabel": "Дата начала",
  "paidNow": "Оплачен сразу",
  "paidNowHint": "создастся платёж {{amount}} ₽",
  "priceLine": "{{label}} · {{amount}} ₽",
  "asPrevLabel": "Как прошлый",
  "tariffLabel": "Абонемент",
  "startLabel": "Начало",
  "startToday": "Сегодня",
  "startTomorrow": "Завтра",
  "startCustom": "Выбрать дату…"
},
```

В объект `subscriptions.issue` добавить `titleWith`:

```json
"issue": {
  "title": "Оформить абонемент",
  "titleWith": "Оформить: {{name}} · «{{group}}»",
  "createBtn": "Оформить",
  "created": "Абонемент оформлен"
},
```

- [ ] **Step 2: Добавить ключи в en**

В `subscriptions.renew` (en):

```json
"renew": {
  "title": "Renew subscription",
  "titleWith": "Renew: {{name}} · «{{group}}»",
  "subRenewed": "Subscription renewed",
  "student": "Student:",
  "group": "Group:",
  "typeLabel": "Subscription type",
  "dateLabel": "Start date",
  "paidNow": "Paid now",
  "paidNowHint": "a payment of {{amount}} ₽ will be created",
  "priceLine": "{{label}} · {{amount}} ₽",
  "asPrevLabel": "Same as last",
  "tariffLabel": "Subscription",
  "startLabel": "Start",
  "startToday": "Today",
  "startTomorrow": "Tomorrow",
  "startCustom": "Pick a date…"
},
```

> ⚠️ В en-локали у `subscriptions.renew` нет полей `student`/`group` (см. факт из кода — там только title/subRenewed/typeLabel/dateLabel/paidNow/paidNowHint/priceLine). Добавлять `student`/`group` НЕ нужно, если их там нет — ориентируйся на фактический файл, сохрани существующие ключи и допиши только новые (`titleWith`, `asPrevLabel`, `tariffLabel`, `startLabel`, `startToday`, `startTomorrow`, `startCustom`).

В `subscriptions.issue` (en) добавить `titleWith`:

```json
"issue": {
  "title": "Issue subscription",
  "titleWith": "Issue: {{name}} · «{{group}}»",
  "createBtn": "Issue",
  "created": "Subscription issued"
},
```

- [ ] **Step 3: Проверить валидность JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/ru/translation.json','utf8'));JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/en/translation.json','utf8'));console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Коммит**

```bash
git add apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(frontend): локали для продления/оформления в один экран"
```

---

## Task 4: Переписать `RenewSubModal` + стили

**Files:**
- Create: `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.scss`
- Modify (rewrite): `apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx`

- [ ] **Step 1: Создать стили**

Создать `renew-sub-modal.scss`:

```scss
.renew-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.renew-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  min-height: 44px;
  border: 1px solid var(--tk-border-default);
  border-radius: var(--r-md);

  &__label {
    color: var(--tk-text-secondary);
    font-size: 0.88rem;
  }

  &__value {
    font-weight: 600;
    font-size: 0.92rem;
    text-align: right;
  }

  /* Select «Начало» без рамки — рамку рисует сама строка. */
  .ant-select {
    font-weight: 600;
  }
}

.renew-paid {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  cursor: pointer;

  &__text {
    display: flex;
    flex-direction: column;
    font-size: 0.92rem;
  }

  &__hint {
    color: var(--tk-text-tertiary);
    font-size: 0.75rem;
  }
}
```

- [ ] **Step 2: Переписать компонент**

Полностью заменить содержимое `renew-sub-modal.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button, Checkbox, DatePicker, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO, tomorrowISO } from 'common/utils/date'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { resolvePricingRule, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { useAddSubscription, useStudents } from '../api/use-students'
import { linkPaymentToSub } from '../model/students.repo'
import { resolveStartDate } from './renew-date'

import type { StartMode } from './renew-date'
import type { SubscriptionType } from '../model/types'
import type { Dayjs } from 'dayjs'

import dayjs from 'dayjs'

import './renew-sub-modal.scss'

interface RenewSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  groupId: string
  onClose: () => void
  /** «Оформить абонемент» вместо «Продлить» — для ученика без абонемента. */
  issueMode?: boolean
  /** Вызывается только при успешном создании (onClose зовётся и при отмене). */
  onCreated?: () => void
}

export function RenewSubModal({
  open,
  studentId,
  studentName,
  groupId,
  onClose,
  issueMode = false,
  onCreated,
}: RenewSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const addSubscription = useAddSubscription()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const [dateMode, setDateMode] = useState<StartMode>('today')
  const [customDate, setCustomDate] = useState(todayISO())
  const [paidNow, setPaidNow] = useState(true)
  const [saving, setSaving] = useState(false)

  // groupId приходит и как имя (из warnings/гейтов), и как UUID — резолвим оба.
  const group = groups.find((g) => g.name === groupId || g.id === groupId) ?? null
  const groupName = group?.name ?? groupId

  // Предыдущий абонемент ученика по данной группе (на уровне рендера).
  const prevSub = useMemo(() => {
    const subs = students.find((s) => s.id === studentId)?.subscriptions ?? []
    return (
      [...subs]
        .filter((s) => s.groupId === groupName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    )
  }, [students, studentId, groupName])

  // Тип фиксирован: прошлый абонемент (нормализован) или разовое при оформлении.
  const type = (prevSub?.type ?? '1').replace('_90', '').replace('_pair', '') as SubscriptionType

  // Итоговая дата начала из выбранного режима.
  const date = resolveStartDate(dateMode, todayISO(), tomorrowISO(), customDate)

  // Живая цена выбранного типа абонемента.
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

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      // validity_days — отдельным запросом (гарантия актуальности, не из кэша).
      const { rule } = await resolvePricingRule(
        group?.locationId ?? null,
        subTypeToTuple(type, group?.isIndividual ?? false),
      )

      const createdSub = await addSubscription.mutateAsync({
        studentId,
        data: {
          groupId,
          type,
          createdAt: date,
          validityDays: rule?.validity_days,
          // Наследуем слот (прайм/обычный) от предыдущего абонемента группы.
          timeSlot: prevSub?.timeSlot ?? 'regular',
        },
      })

      if (paidNow && createdSub) {
        const fin = await autoCreatePayment(
          studentId,
          { id: createdSub.id, type, createdAt: date },
          group?.isIndividual ?? false,
          { isPrime: slot === 'prime', locationId: group?.locationId ?? null },
        )
        if (fin) {
          await linkPaymentToSub(studentId, createdSub.id, fin.paymentId)
        } else {
          toast({ type: 'warn', title: t('finance.autoRecord.noTariff') })
        }
      }

      toast({
        type: 'success',
        title: issueMode ? t('subscriptions.issue.created') : t('subscriptions.renew.subRenewed'),
        msg: `${studentName} · ${groupName}`,
      })
      onCreated?.()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleDateMode = (v: StartMode) => setDateMode(v)
  const handleCustom = (d: Dayjs | null) => setCustomDate(d ? d.format('YYYY-MM-DD') : todayISO())

  const typeLabel = t(`students.subTypes.${type}`, { defaultValue: type })
  const priceText = price !== null ? `${typeLabel} · ${price} ₽` : typeLabel

  return (
    <AdaptiveSheet
      open={open}
      title={t(issueMode ? 'subscriptions.issue.titleWith' : 'subscriptions.renew.titleWith', {
        name: studentName,
        group: groupName,
      })}
      onClose={onClose}
      footer={
        <Button className="tk-btn-primary" type="primary" block loading={saving} onClick={submit}>
          {issueMode ? t('subscriptions.issue.createBtn') : t('common.extend')}
        </Button>
      }
    >
      <div className="renew-sheet">
        <div className="renew-row">
          <span className="renew-row__label">
            {issueMode
              ? t('subscriptions.renew.tariffLabel')
              : t('subscriptions.renew.asPrevLabel')}
          </span>
          <span className="renew-row__value">{priceText}</span>
        </div>
        <div className="renew-row">
          <span className="renew-row__label">{t('subscriptions.renew.startLabel')}</span>
          <Select
            value={dateMode}
            onChange={handleDateMode}
            variant="borderless"
            popupMatchSelectWidth={false}
            options={[
              { value: 'today', label: t('subscriptions.renew.startToday') },
              { value: 'tomorrow', label: t('subscriptions.renew.startTomorrow') },
              { value: 'custom', label: t('subscriptions.renew.startCustom') },
            ]}
          />
        </div>
        {dateMode === 'custom' && (
          <DatePicker
            format="DD.MM.YYYY"
            style={{ width: '100%' }}
            value={dayjs(customDate)}
            onChange={handleCustom}
          />
        )}
        <label className="renew-paid">
          <Checkbox checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
          <span className="renew-paid__text">
            {t('subscriptions.renew.paidNow')}
            {paidNow && price !== null && (
              <span className="renew-paid__hint">
                {t('subscriptions.renew.paidNowHint', { amount: price })}
              </span>
            )}
          </span>
        </label>
      </div>
    </AdaptiveSheet>
  )
}
```

- [ ] **Step 3: Сборка фронта (tsc + vite)**

Run: `npm run build -w apps/frontend`
Expected: успешная сборка, 0 ошибок TypeScript.

- [ ] **Step 4: eslint**

Run: `npm run lint -w apps/frontend`
Expected: 0 ошибок, 0 предупреждений в затронутых файлах.

- [ ] **Step 5: Коммит**

```bash
git add apps/frontend/src/entities/students/subscriptions/renew-sub-modal.tsx apps/frontend/src/entities/students/subscriptions/renew-sub-modal.scss
git commit -m "feat(frontend): продление/оформление в один экран — макет 3а"
```

---

## Task 5: Gate и ручная проверка

**Files:** —

- [ ] **Step 1: Все тесты фронта**

Run: `npm test -w apps/frontend`
Expected: PASS (включая новые date.spec / renew-date.spec; существующие не сломаны).

- [ ] **Step 2: Финальная сборка**

Run: `npm run build -w apps/frontend`
Expected: успех.

- [ ] **Step 3: Ручная проверка в браузере (localhost:3020, demo@trikick.ru / demo1234)**

Сценарии:
1. Главная → у Маши (Старт · Заканчивается) «Продлить» → заголовок «Продлить: Маша · «Старт»»; плашка «Как прошлый · 8 занятий · цена»; «Начало: Сегодня»; галочка «Оплачен сразу» + «создастся платёж … ₽»; «Продлить» создаёт абонемент и платёж (в Финансах есть; абонемент не в «Ожидают оплаты»).
2. Отметка группы «Старт» → у Пети «Оформить» → заголовок «Оформить: Петя · «Старт»»; дефолт «Разовое» + цена; «Оформить» создаёт разовый абонемент.
3. «Начало → Завтра» и «→ Выбрать дату…» меняют дату создаваемого абонемента (виден DatePicker при «Выбрать дату…»).
4. Свитч/галочка «Оплачен сразу» OFF → абонемент попадает в «Ожидают оплаты» (старое поведение).

- [ ] **Step 4: Финальный коммит (если правки по ходу проверки)**

```bash
git add -A
git commit -m "fix(frontend): правки продления по ручной проверке"
```

---

## Self-Review

**Spec coverage:**
- §2 раскладка/заголовок/плашка/начало/оплачен → Task 4 (вёрстка) + Task 3 (тексты). ✓
- §3 issue-mode (titleWith, дефолт разовое) → Task 3 (`issue.titleWith`) + Task 4 (`?? '1'`, `tariffLabel`). ✓
- §4 убраны типы → Task 4 (нет Select типа; `lessonKind` из `group.isIndividual` в `subTypeToTuple`). ✓
- §5 поведение (цена живая, слот, авто-платёж, дата) → Task 4 (submit без изменений логики) + Task 1/2 (дата). ✓
- §6 файлы → совпадают с Task 1-4. ✓
- §8 тесты → Task 1/2 (vitest), Task 5 (build/lint/ручная). ✓

**Placeholder scan:** код приведён полностью в каждом шаге; команд с ожидаемым выводом — есть. Плейсхолдеров нет. ✓

**Type consistency:** `StartMode` определён в Task 2, используется в Task 4 (`useState<StartMode>`, `handleDateMode`). `resolveStartDate(mode, today, tomorrow, custom)` — сигнатура совпадает в Task 2 и вызове Task 4. `tomorrowISO` определён в Task 1, импортируется в Task 4. Ключи локалей из Task 3 (`titleWith`, `asPrevLabel`, `tariffLabel`, `startLabel`, `startToday/Tomorrow/Custom`) используются в Task 4. ✓

**Примечание по совместимости:** `RenewSubModal` вызывается из 4 мест (home-page, quick-mark-sheet, calendar-training-modal, student-drawer) — props не меняются, обратная совместимость сохранена.
