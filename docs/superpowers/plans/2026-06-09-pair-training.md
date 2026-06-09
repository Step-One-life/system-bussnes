# Парные (сплит) тренировки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Записывать парные (сплит) тренировки на двух учеников с отдельным pair-тарифом (цена и зал на одного), разовые и еженедельными сериями, с оплатой при отметке посещения.

**Architecture:** Парное занятие = занятие в индивидуальной группе-контейнере с признаком `is_pair` и двумя плановыми учениками (`plannedStudentId`, `plannedStudentId2`). При отметке бэкенд не списывает абонемент (по `is_pair`), а фронт пишет разовый платёж по pair-тарифу через существующую механику Части 2. Новый вид тарифа `pair`, типы оплаты `single_pair`/`single_pair_90`.

**Tech Stack:** NestJS+Sequelize+MySQL (backend), React+antd+react-query (frontend), общий пакет `@trikick/shared`. Спека: `docs/superpowers/specs/2026-06-09-pair-training-design.md`.

**Ветка:** `feat/pair-training`.

**Условные обозначения:** `FE=apps/frontend/src`, `BE=apps/backend/src`, `SH=packages/shared/src`. Проверка фронта — `npm run build -w apps/frontend` (tsc -b && vite build). Проверка бэка — `npm run build -w apps/backend` + `npm test -w apps/backend`. Репо-конвенции: без точек с запятой, одинарные кавычки, 2 пробела. Тексты UI через i18next (ключи в `FE/locales/{ru,en}/translation.json`).

---

## File Structure

**Shared:**
- `SH/enums/index.ts` — `ClientPaymentType` += `single_pair`/`single_pair_90`; `LessonKind` += `pair`.
- `SH/api/shapes.ts` — `CreateTrainingShape` и доменный shape тренировки += `isPair`, `plannedStudentId2`.

**Backend:**
- Новая миграция `BE/database/migrations/*-pair-training.*` — колонки `is_pair`, `planned_student_id_2`.
- `BE/modules/training/training.model.ts` — поля `isPair`, `plannedStudentId2`.
- `BE/modules/training/dto/create-training.dto.ts` — поля `isPair`, `plannedStudentId2`.
- `BE/modules/training/training.service.ts` — проброс полей в `createForUser`; в `markAttendance` не списывать при `isPair`.

**Frontend — финансы/тарифы:**
- `FE/entities/finance/model/types.ts` — синхронизировать `ClientPaymentType`/`LessonKind`.
- `FE/entities/finance/lib/pricing-lookup.ts` — pair-кортежи в `subTypeToTuple`/`clientTypeToTuple`.
- `FE/entities/finance/lib/auto-payment.ts` — `SubType` += `1_pair`/`1_pair_90`; `subPaymentType`.
- `FE/entities/finance/model/finance-constants.ts` — `FIN_LABELS` для новых типов.
- `FE/entities/finance/pricing/pricing-config.ts` — `LESSON_KINDS` += `pair`.

**Frontend — тренировки:**
- `FE/entities/trainings/model/types.ts` — `Training` += `isPair`, `plannedStudentId2`.
- `FE/entities/trainings/model/trainings.repo.ts` — маппинг новых полей при создании/чтении.
- `FE/entities/trainings/form/training-type-modal.tsx` — кнопка «Парная».
- `FE/entities/trainings/form/use-pair-session.ts` — новый хук формы парной.
- `FE/entities/trainings/form/pair-session-modal.tsx` — новая модалка.
- `FE/pages/home/home-page.tsx`, `FE/pages/trainings/trainings-page.tsx` — подключить модалку + `onPickPair`.
- `FE/entities/trainings/model/training-logic.ts` — `markAttendanceWithPayment` использует pair-тип.
- `FE/pages/home/use-mark-today.ts` — показать оба плановых ученика парного.
- `FE/entities/trainings/calendar/*` + карточка занятия — подпись «Парная: A + B».
- `FE/locales/{ru,en}/translation.json` — все новые тексты.

---

## Task 1: Типы pair в shared

**Files:**
- Modify: `SH/enums/index.ts`
- Modify: `SH/api/shapes.ts`

- [ ] **Step 1: Расширить enums**

В `SH/enums/index.ts` в `ClientPaymentType` добавить две строки в объединение (после `single_individual_90`):
```ts
  | 'single_pair'
  | 'single_pair_90'
```
И заменить `LessonKind`:
```ts
export type LessonKind = 'individual' | 'group' | 'online' | 'shared' | 'pair'
```

- [ ] **Step 2: Расширить shape тренировки**

В `SH/api/shapes.ts`, в `CreateTrainingShape` (после `plannedStudentId?: string | null`) добавить:
```ts
  isPair?: boolean
  plannedStudentId2?: string | null
```
Если в этом файле есть доменный shape тренировки с теми же полями (`isOnline`, `plannedStudentId`) — добавить туда `isPair: boolean` и `plannedStudentId2: string | null` тоже (искать по `plannedStudentId` в файле).

- [ ] **Step 3: Собрать shared**

Run: `npm run build -w packages/shared`
Expected: без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src
git commit -m "feat(shared): типы pair — LessonKind 'pair', single_pair оплаты, поля тренировки"
```

---

## Task 2: Резолв pair-тарифа (frontend finance)

**Files:**
- Modify: `FE/entities/finance/model/types.ts`
- Modify: `FE/entities/finance/lib/auto-payment.ts`
- Modify: `FE/entities/finance/lib/pricing-lookup.ts`
- Modify: `FE/entities/finance/model/finance-constants.ts`

- [ ] **Step 1: Синхронизировать дублирующие типы**

В `FE/entities/finance/model/types.ts` так же расширить `ClientPaymentType` (+ `single_pair`, `single_pair_90`) и `LessonKind` (+ `pair`), как в Task 1.

- [ ] **Step 2: SubType и subPaymentType (auto-payment.ts)**

В `FE/entities/finance/lib/auto-payment.ts` в `type SubType` добавить `'1_pair' | '1_pair_90'`:
```ts
type SubType = '1' | '4' | '8' | '1_90' | '4_90' | '8_90' | '1_pair' | '1_pair_90'
```
В функции `subPaymentType` перед `return null` добавить:
```ts
  if (subType === '1_pair') return 'single_pair'
  if (subType === '1_pair_90') return 'single_pair_90'
```

- [ ] **Step 3: Кортежи тарифа (pricing-lookup.ts)**

В `FE/entities/finance/lib/pricing-lookup.ts`:
- В `type SubType` добавить `'1_pair' | '1_pair_90'` (как выше).
- В `subTypeToTuple` `switch` добавить ветки:
```ts
    case '1_pair':
      return { lessonKind: 'pair', format: 'single', durationMinutes: 60, sessionsCount: 1 }
    case '1_pair_90':
      return { lessonKind: 'pair', format: 'single', durationMinutes: 90, sessionsCount: 1 }
```
- В `clientTypeToTuple` `switch` добавить:
```ts
    case 'single_pair':
      return { lessonKind: 'pair', format: 'single', durationMinutes: 60, sessionsCount: 1 }
    case 'single_pair_90':
      return { lessonKind: 'pair', format: 'single', durationMinutes: 90, sessionsCount: 1 }
```

- [ ] **Step 4: Метки (finance-constants.ts)**

В `FE/entities/finance/model/finance-constants.ts` в объект `FIN_LABELS` добавить (значения — через существующий стиль файла, например):
```ts
  single_pair: 'Парное разовое',
  single_pair_90: 'Парное разовое 1.5ч',
```
(Если `FIN_LABELS` типизирован как `Record<ClientPaymentType, string>` — после Task 1/Step1 эти ключи станут обязательными, и сборка укажет на пропуск.)

- [ ] **Step 5: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/entities/finance
git commit -m "feat(frontend): резолв pair-тарифа и метки single_pair"
```

---

## Task 3: Pair в форме тарифа + локали тарифа

**Files:**
- Modify: `FE/entities/finance/pricing/pricing-config.ts`
- Modify: `FE/locales/ru/translation.json`, `FE/locales/en/translation.json`

- [ ] **Step 1: Добавить 'pair' в список видов**

В `FE/entities/finance/pricing/pricing-config.ts`:
```ts
export const LESSON_KINDS: LessonKind[] = ['individual', 'group', 'online', 'shared', 'pair']
```

- [ ] **Step 2: Локали для вида «Парная»**

В обоих `translation.json` в `finance.pricing.lessonKind` добавить ключ:
```json
      "pair": "Парная"
```
(в en — `"pair": "Pair"`).

- [ ] **Step 3: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок; в форме тарифа появляется вид «Парная».

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/finance/pricing/pricing-config.ts apps/frontend/src/locales
git commit -m "feat(frontend): вид тарифа «Парная» в форме цен"
```

---

## Task 4: Миграция + бэкенд (поля, не-списание при pair)

**Files:**
- Create: `BE/database/migrations/<timestamp>-pair-training.js` (формат — как у соседних миграций; СНАЧАЛА посмотреть существующую миграцию в этой папке и повторить её стиль/расширение)
- Modify: `BE/modules/training/training.model.ts`
- Modify: `BE/modules/training/dto/create-training.dto.ts`
- Modify: `BE/modules/training/training.service.ts`

- [ ] **Step 1: Изучить формат миграций**

Run: `ls apps/backend/src/database/migrations && sed -n '1,40p' "$(ls apps/backend/src/database/migrations/* | tail -1)"`
Запомнить: расширение (.js/.ts), сигнатуру up/down, как добавляют колонки (`queryInterface.addColumn`).

- [ ] **Step 2: Написать миграцию**

Создать файл по образцу. Содержимое up: добавить две колонки в `trainings`:
```js
await queryInterface.addColumn('trainings', 'is_pair', {
  type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
})
await queryInterface.addColumn('trainings', 'planned_student_id_2', {
  type: Sequelize.CHAR(36), allowNull: true,
})
```
down: `removeColumn` обеих колонок. (Точные импорты/обёртку взять из соседней миграции.)

- [ ] **Step 3: Применить миграцию**

Run: команду миграций проекта (посмотреть в `apps/backend/package.json` scripts, напр. `npm run migrate -w apps/backend` или `sequelize db:migrate`). Применить и убедиться, что колонки появились:
`/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick -e "SHOW COLUMNS FROM trainings LIKE 'is_pair'; SHOW COLUMNS FROM trainings LIKE 'planned_student_id_2';"`
Expected: обе колонки присутствуют.

- [ ] **Step 4: Поля в модели**

В `BE/modules/training/training.model.ts` после `plannedStudentId` добавить:
```ts
  @Column({ field: 'is_pair', type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isPair: boolean

  @Column({ field: 'planned_student_id_2', type: DataType.UUID, allowNull: true })
  declare plannedStudentId2: string | null
```

- [ ] **Step 5: Поля в DTO**

В `BE/modules/training/dto/create-training.dto.ts` в конец класса добавить:
```ts
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPair?: boolean

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Второй плановый ученик (парная)' })
  @IsOptional()
  @IsUUID()
  plannedStudentId2?: string | null
```

- [ ] **Step 6: Проброс в createForUser + не списывать при pair**

В `BE/modules/training/training.service.ts`, в `createTraining` → объекте, передаваемом в `this.createForUser(userId, { ... })`, добавить:
```ts
      isPair: dto.isPair ?? false,
      plannedStudentId2: dto.plannedStudentId2 ?? null,
```
В методе `markAttendance(training, studentIds)` (около стр. 165) сделать списание условным — парное не списывает абонемент. Заменить тело цикла так, чтобы `deduct` вызывался только для НЕ-парных:
```ts
  async markAttendance(training: Training, studentIds: string[]): Promise<void> {
    await training.$add('attendees', studentIds)
    for (const studentId of studentIds) {
      if (!training.isPair) {
        await this.subscriptionsService.deduct(
          studentId,
          training.groupId,
          training.sessionDuration,
        )
      }
      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
      })
    }
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }
```

- [ ] **Step 7: Сборка + тесты бэка**

Run: `npm run build -w apps/backend && npm test -w apps/backend`
Expected: сборка без ошибок, тесты зелёные.

- [ ] **Step 8: Commit**

```bash
git add apps/backend
git commit -m "feat(backend): поля is_pair/planned_student_id_2 + парная отметка без списания"
```

---

## Task 5: Поля pair во фронтовой модели тренировки

**Files:**
- Modify: `FE/entities/trainings/model/types.ts`
- Modify: `FE/entities/trainings/model/trainings.repo.ts`

- [ ] **Step 1: Поля в типе Training**

В `FE/entities/trainings/model/types.ts` в интерфейс `Training` (рядом с `plannedStudentId`, `isOnline`) добавить:
```ts
  isPair: boolean
  plannedStudentId2: string | null
```
Если есть тип `TrainingInput` (вход создания) — добавить опциональные `isPair?: boolean` и `plannedStudentId2?: string | null`.

- [ ] **Step 2: Маппинг в репозитории**

В `FE/entities/trainings/model/trainings.repo.ts` найти место маппинга ответа API в `Training` (где читаются `plannedStudentId`/`isOnline`) и добавить:
```ts
    isPair: raw.isPair ?? false,
    plannedStudentId2: raw.plannedStudentId2 ?? null,
```
И в `createTraining` (тело запроса) пробрасывать `isPair` и `plannedStudentId2`, если они переданы во входе (рядом с `plannedStudentId`, `isOnline`). Точные имена полей подсмотреть в существующем маппинге файла.

- [ ] **Step 3: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок (поля не используются — нормально).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings/model/types.ts apps/frontend/src/entities/trainings/model/trainings.repo.ts
git commit -m "feat(frontend): поля is_pair/plannedStudentId2 в модели тренировки"
```

---

## Task 6: Кнопка «Парная» в выборе типа

**Files:**
- Modify: `FE/entities/trainings/form/training-type-modal.tsx`
- Modify: `FE/pages/home/home-page.tsx`
- Modify: `FE/pages/trainings/trainings-page.tsx`
- Modify: `FE/locales/{ru,en}/translation.json`

- [ ] **Step 1: Проп и кнопка в модалке типа**

В `FE/entities/trainings/form/training-type-modal.tsx`:
- В `TrainingTypeModalProps` добавить `onPickPair: () => void`.
- В деструктуризацию пропсов добавить `onPickPair`.
- Импорт иконки: добавить `UsergroupAddOutlined` к импортам из `@ant-design/icons`.
- После кнопки online добавить карточку:
```tsx
        <button className="training-type-card" onClick={onPickPair}>
          <UsergroupAddOutlined />
          <span>{t('trainings.type.pair')}</span>
        </button>
```

- [ ] **Step 2: Локали типа**

В обоих `translation.json` в `trainings.type` добавить `"pair": "Парная"` (en: `"pair": "Pair"`).

- [ ] **Step 3: Подключить в home-page**

В `FE/pages/home/home-page.tsx` найти использование `<TrainingTypeModal ... onPickOnline={...} />` и состояние, открывающее индивидуальную/онлайн модалку. Добавить:
- состояние открытия парной (по образцу online), напр. `const [pairOpen, setPairOpen] = useState(false)`.
- в `TrainingTypeModal` проп `onPickPair={() => { /* закрыть выбор типа */ ; setPairOpen(true) }}` (повторить паттерн `onPickOnline`).
- рендер `<PairSessionModal open={pairOpen} indGroupId={<тот же indGroupId, что для individual/online>} onClose={() => setPairOpen(false)} />` (компонент из Task 7; импорт добавить).

- [ ] **Step 4: Подключить в trainings-page**

Повторить Step 3 для `FE/pages/trainings/trainings-page.tsx` (тот же паттерн состояния и рендера, что для online).

- [ ] **Step 5: Сборка**

Run: `npm run build -w apps/frontend`
Expected: ошибка про отсутствующий `PairSessionModal` исчезнет после Task 7; на этом шаге допустимо завершить Task 7 до сборки. (Если делаете строго по порядку — закоммитьте Step 1–2 отдельно, а Step 3–4 вместе с Task 7.)

- [ ] **Step 6: Commit (модалка типа + локали)**

```bash
git add apps/frontend/src/entities/trainings/form/training-type-modal.tsx apps/frontend/src/locales
git commit -m "feat(frontend): кнопка «Парная» в выборе типа занятия"
```

---

## Task 7: Хук и модалка парной сессии

**Files:**
- Create: `FE/entities/trainings/form/use-pair-session.ts`
- Create: `FE/entities/trainings/form/pair-session-modal.tsx`
- Modify: `FE/locales/{ru,en}/translation.json`

- [ ] **Step 1: Хук use-pair-session**

Создать `FE/entities/trainings/form/use-pair-session.ts` по образцу `use-individual-session.ts` (режим «Разово»), но без абонемента/оплаты. Ключевая логика `submit` (формирует плановые парные занятия и проверяет конфликт по всем датам серии):
```ts
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDateShort, todayISO } from 'common/utils/date'
import { uuid } from 'common/utils/uuid'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'
import { studentKeys, useStudents } from 'entities/students/api/use-students'

import { useCreateTraining } from '../api/use-trainings'
import { checkTrainingConflict, isPrimeTime } from '../model/training-logic'
import { weeklySeriesDates } from '../model/weekly-series'

interface UsePairSessionOptions {
  indGroupId: string
  onDone: () => void
}

export function usePairSession({ indGroupId, onDone }: UsePairSessionOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const { data: locations = [] } = useLocations()
  const createTraining = useCreateTraining()

  const indGroup = groups.find((g) => g.name === indGroupId) ?? null

  const [duration, setDuration] = useState(60)
  const [clientA, setClientA] = useState('')
  const [clientB, setClientB] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('18:00')
  const [recurring, setRecurring] = useState(false)
  const [repeatCount, setRepeatCount] = useState(1)
  const [note, setNote] = useState('')
  const [locationId, setLocationIdState] = useState<string | null>(null)
  const [locationTouched, setLocationTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const effectiveLocationId = locationTouched ? locationId : (indGroup?.locationId ?? null)
  const setLocationId = (id: string | null) => {
    setLocationTouched(true)
    setLocationIdState(id)
  }

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const submit = async () => {
    if (!clientA || !clientB || !date) {
      toast({ type: 'error', title: t('trainings.pair.pickBoth') })
      return
    }
    if (clientA === clientB) {
      toast({ type: 'error', title: t('trainings.pair.sameClient') })
      return
    }
    const seriesLen = recurring ? Math.max(1, repeatCount) : 1
    const dates = weeklySeriesDates(date, seriesLen)
    const conflictDates: string[] = []
    for (const d of dates) {
      const c = await checkTrainingConflict(d, time, indGroupId, null, duration)
      if (c.length) conflictDates.push(formatDateShort(d))
    }
    if (conflictDates.length) {
      toast({ type: 'error', title: t('trainings.pair.scheduleConflict'), msg: conflictDates.join(', ') })
      return
    }

    setSaving(true)
    try {
      const effectiveLocation = locations.find((l) => l.id === effectiveLocationId) ?? null
      const recurringId = seriesLen > 1 ? uuid() : null
      for (const d of dates) {
        await createTraining.mutateAsync({
          date: d,
          time,
          groupId: indGroupId,
          locationId: effectiveLocationId,
          attendees: [],
          plannedStudentId: clientA,
          plannedStudentId2: clientB,
          isPair: true,
          note: note.trim(),
          isPrime: isPrimeTime(d, time, effectiveLocation),
          sessionDuration: duration,
          recurring: seriesLen > 1,
          recurringId,
        })
      }
      qc.invalidateQueries({ queryKey: studentKeys.all })
      toast({ type: 'success', title: t('trainings.pair.recorded') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  return {
    sortedStudents, duration, setDuration, clientA, setClientA, clientB, setClientB,
    date, setDate, time, setTime, recurring, setRecurring, repeatCount, setRepeatCount,
    note, setNote, locationId: effectiveLocationId, setLocationId, saving, submit,
  }
}
```
(Примечание: `useCreateTraining().mutateAsync` принимает `TrainingInput`; убедиться, что `isPair`/`plannedStudentId2` входят в `TrainingInput` после Task 5. Поля `attendees`, `plannedStudentId`, `recurring`, `recurringId`, `isPrime`, `sessionDuration` — как в `use-individual-session`.)

- [ ] **Step 2: Модалка pair-session-modal**

Создать `FE/entities/trainings/form/pair-session-modal.tsx` по образцу `individual-session-modal.tsx`, но с двумя селектами клиента и без блока абонемента/оплаты:
```tsx
import { Button, Form, Input, InputNumber, Modal, Select } from 'antd'
import { CheckOutlined, SyncOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'

import { usePairSession } from './use-pair-session'

import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface PairSessionModalProps {
  open: boolean
  indGroupId: string
  onClose: () => void
}

export function PairSessionModal({ open, indGroupId, onClose }: PairSessionModalProps) {
  const { t } = useTranslation()
  const form = usePairSession({ indGroupId, onDone: onClose })

  const handleSelectDuration = (d: number) => () => form.setDuration(d)
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => form.setDate(e.target.value)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => form.setTime(e.target.value)
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => form.setNote(e.target.value)
  const handleToggleRecurring = () => form.setRecurring(!form.recurring)

  const options = form.sortedStudents.map((s) => ({ value: s.id, label: s.name }))

  const footer = [
    <Button key="cancel" onClick={onClose}>{t('common.cancel')}</Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('trainings.pair.create')}
    </Button>,
  ]

  return (
    <Modal open={open} title={t('trainings.pair.title')} onCancel={onClose} footer={footer} destroyOnHidden>
      <Form layout="vertical">
        <Form.Item label={t('trainings.individual.durationLabel')}>
          <div className="dur-toggle">
            {[60, 90].map((d) => (
              <button
                key={d}
                className={`dur-toggle__btn${form.duration === d ? ' dur-toggle__btn--active' : ''}`}
                onClick={handleSelectDuration(d)}
              >
                {d === 90 ? t('trainings.individual.duration90') : t('trainings.individual.duration60')}
              </button>
            ))}
          </div>
        </Form.Item>

        <Form.Item label={t('trainings.pair.clientA')}>
          <Select value={form.clientA || undefined} placeholder={t('trainings.individual.clientPlaceholder')}
            onChange={form.setClientA} options={options} />
        </Form.Item>
        <Form.Item label={t('trainings.pair.clientB')}>
          <Select value={form.clientB || undefined} placeholder={t('trainings.individual.clientPlaceholder')}
            onChange={form.setClientB} options={options} />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('trainings.individual.dateLabel')}>
            <Input type="date" value={form.date} onChange={handleDateChange} />
          </Form.Item>
          <Form.Item label={t('trainings.individual.timeLabel')}>
            <Input type="time" value={form.time} onChange={handleTimeChange} />
          </Form.Item>
        </div>

        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>

        <Form.Item>
          <div className={`rec-toggle-card${form.recurring ? ' rec-toggle-card--checked' : ''}`} onClick={handleToggleRecurring}>
            <SyncOutlined className="rec-toggle-card__icon" />
            <div className="rec-toggle-card__text">
              <span className="rec-toggle-card__label">{t('trainings.individual.weekly')}</span>
              <span className="rec-toggle-card__hint">{t('trainings.pair.weeklyHint')}</span>
            </div>
            <div className="rec-toggle-card__check">{form.recurring && <CheckOutlined />}</div>
          </div>
        </Form.Item>

        {form.recurring && (
          <Form.Item label={t('trainings.individual.repeatLabel')}>
            <InputNumber min={1} max={52} value={form.repeatCount}
              onChange={(v) => form.setRepeatCount(typeof v === 'number' ? v : 1)} style={{ width: '100%' }} />
          </Form.Item>
        )}

        <Form.Item label={t('trainings.individual.noteLabel')}>
          <Input.TextArea rows={2} value={form.note} onChange={handleNoteChange}
            placeholder={t('trainings.individual.notePlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
```

- [ ] **Step 3: Локали парной модалки**

В обоих `translation.json` добавить блок `trainings.pair` (ru):
```json
    "pair": {
      "title": "Записать парную тренировку",
      "create": "Создать занятие",
      "clientA": "Первый ученик",
      "clientB": "Второй ученик",
      "pickBoth": "Выберите обоих учеников и дату",
      "sameClient": "Выберите двух разных учеников",
      "scheduleConflict": "Конфликт расписания",
      "recorded": "Парное занятие записано",
      "weeklyHint": "Создать парные занятия на каждую неделю (оплата по мере подтверждения)"
    }
```
(en — те же ключи на английском.)

- [ ] **Step 4: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/use-pair-session.ts apps/frontend/src/entities/trainings/form/pair-session-modal.tsx apps/frontend/src/locales apps/frontend/src/pages/home/home-page.tsx apps/frontend/src/pages/trainings/trainings-page.tsx
git commit -m "feat(frontend): модалка и хук парной тренировки, подключение в страницы"
```

---

## Task 8: Оплата при отметке парного + показ двух плановых

**Files:**
- Modify: `FE/entities/trainings/model/training-logic.ts`
- Modify: `FE/pages/home/use-mark-today.ts`

- [ ] **Step 1: pair-тип в markAttendanceWithPayment**

В `FE/entities/trainings/model/training-logic.ts`, в `markAttendanceWithPayment` заменить вычисление `type` и убрать пропуск по абонементу для парного. Текущее:
```ts
  const isInd = isIndividualTraining(training.groupId, groups)
  const type: '1' | '1_90' = training.sessionDuration === 90 ? '1_90' : '1'

  for (const sid of studentIds) {
    const student = await getStudentById(sid)
    const hasActive = student?.subscriptions.some(
      (s) => s.groupId === training.groupId && s.isActive,
    )
    if (hasActive) continue
    await autoCreatePayment(
      sid,
      { id: '', type, createdAt: training.date },
      isInd,
      { time: training.time, locationId: training.locationId, isOnline: training.isOnline },
    )
  }
```
заменить на:
```ts
  const isInd = isIndividualTraining(training.groupId, groups)
  const isPair = training.isPair
  const type: '1' | '1_90' | '1_pair' | '1_pair_90' = isPair
    ? (training.sessionDuration === 90 ? '1_pair_90' : '1_pair')
    : (training.sessionDuration === 90 ? '1_90' : '1')

  for (const sid of studentIds) {
    // Парное занятие всегда пишет парный платёж (абонемент не списывается на бэке),
    // поэтому проверку активного абонемента пропускаем только для НЕ-парных.
    if (!isPair) {
      const student = await getStudentById(sid)
      const hasActive = student?.subscriptions.some(
        (s) => s.groupId === training.groupId && s.isActive,
      )
      if (hasActive) continue
    }
    await autoCreatePayment(
      sid,
      { id: '', type, createdAt: training.date },
      isInd,
      { time: training.time, locationId: training.locationId, isOnline: training.isOnline },
    )
  }
```
(`autoCreatePayment`'s `AutoSub.type` уже принимает расширенный `SubType` из Task 2; `isInd` для pair не влияет на резолв — кортеж берётся по `subTypeToTuple('1_pair')` = `pair/...`.)

- [ ] **Step 2: Показать оба плановых ученика в «Отметить за сегодня»**

В `FE/pages/home/use-mark-today.ts`, в построении `todayIndividuals` (где для индивидуального планового добавляется один `plannedStudentId`) — для парного занятия добавить ОБА плановых. Найти блок, где `tr.plannedStudentId` пушится как неотмеченный, и расширить: если `tr.isPair`, добавить запись и для `tr.plannedStudentId`, и для `tr.plannedStudentId2` (оба как `originalPresent: false`). Псевдо-вставка рядом с существующей логикой планового:
```ts
        } else if (tr.isPair) {
          for (const sid of [tr.plannedStudentId, tr.plannedStudentId2]) {
            if (!sid) continue
            result.push({
              trainingId: tr.id,
              studentId: sid,
              time: tr.time ?? '',
              groupId: g.name,
              originalPresent: false,
            })
          }
        } else if (tr.plannedStudentId) {
```
(вставить ветку `tr.isPair` ПЕРЕД существующей `else if (tr.plannedStudentId)`; отметка каждого уже идёт через `markAttendanceWithPayment(tr, [ti.studentId])`, изменённый в Step 1.)

- [ ] **Step 3: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings/model/training-logic.ts apps/frontend/src/pages/home/use-mark-today.ts
git commit -m "feat(frontend): парная оплата при отметке и показ обоих учеников"
```

---

## Task 9: Отображение парного занятия

**Files:**
- Modify: карточка/элемент занятия в `FE/entities/trainings` (найти, где формируется заголовок индивидуального занятия — напр. `calendar/use-calendar-training.ts` строит `title`, и список в `entities/trainings/*item*` / `pages/trainings`)
- Modify: `FE/locales/{ru,en}/translation.json`

- [ ] **Step 1: Подпись «Парная: A + B»**

Найти места, где для индивидуального занятия строится заголовок по `attendees[0]`/`plannedStudentId` (например `useCalendarTraining` `title`, и в списке тренировок). Добавить ветку: если `training.isPair`, заголовок — имена обоих учеников:
```ts
  const pairName = training?.isPair
    ? `${nameOf(training.plannedStudentId)} + ${nameOf(training.plannedStudentId2)}`
    : null
```
где `nameOf(id)` — поиск имени в `students` (по образцу существующего поиска `clientName`). Использовать ключ `t('trainings.pair.label', { names: pairName })`.

- [ ] **Step 2: Локаль метки**

В обоих `translation.json` в `trainings.pair` добавить `"label": "Парная: {{names}}"` (en: `"label": "Pair: {{names}}"`).

- [ ] **Step 3: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings apps/frontend/src/locales
git commit -m "feat(frontend): подпись парного занятия в календаре и списке"
```

---

## Task 10: Ручная проверка end-to-end

**Предусловие:** MySQL, бэкенд (3021), фронт (3020) запущены; миграция применена. Демо `demo@trikick.ru` / `demo1234`.

- [ ] **Step 1: Тариф «Парная»**

Финансы → Настройка цен → добавить тариф вида «Парная», 60 мин, разовое, задать цену клиента и расход зала (на одного). Сохранить.

- [ ] **Step 2: Создать парную (разовую)**

«Записать тренировку» → «Парная» → выбрать двух разных учеников, дату/время, локацию (с pair-тарифом), длительность 1ч → Создать. Ожидание: занятие создано плановым (не отмечено).

- [ ] **Step 3: Отметить обоих**

«Отметить за сегодня» (или из календаря) → отметить обоих учеников парного занятия → Сохранить.
Проверка БД (UTC!):
```bash
/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick --table -e "SELECT client_payment_type, client_amount FROM payments WHERE created_at > (UTC_TIMESTAMP() - INTERVAL 10 MINUTE);"
```
Ожидание: два платежа `single_pair` + два расхода зала; индивидуальные абонементы учеников НЕ списаны.

- [ ] **Step 4: Парная серия**

Создать парную с галочкой «Еженедельно», 4 занятия. Ожидание: 4 плановых парных занятия с общим `recurringId`; если будущая дата конфликтует — блокировка с перечислением дат.

- [ ] **Step 5: Нет тарифа**

Создать парную в локации без pair-тарифа, отметить. Ожидание: отметка прошла, платёж не записан, без ошибок.

---

## Notes / ограничения (из спеки)

- Снятие отметки не откатывает платёж (ручная корректировка в финансах).
- Парные и абонементы не смешиваются: парная отметка не списывает абонемент, всегда пишет парный платёж.
- Расход зала и цена — на одного участника; двое отмечены = полный зал.
