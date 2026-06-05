# Редактирование тренировки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать тренеру форму редактирования существующей тренировки (дата/время/локация/заметка/онлайн/прайм) с поддержкой повторяющихся серий и автосинхронизацией в Google.

**Architecture:** Отдельная единая модалка `EditTrainingModal` + хук `useEditTraining` (Подход A — форму создания не трогаем). Одиночная правка идёт в существующий `PATCH /trainings/:id`; «вся серия» — в новый `PATCH /trainings/recurring/:recurringId`. Каждое обновление ставит `upsert` в аутбокс Google (уже работает). Точки входа: кнопка в карточке списка и кнопка в модалке календаря.

**Tech Stack:** Backend — NestJS + Sequelize, jest (чистые функции). Frontend — React + antd + react-query + i18next. Спецификация: `docs/superpowers/specs/2026-06-06-training-edit-design.md`.

**Ветка:** `feat/google-calendar-sync` (продолжаем на ней).

**Условные обозначения:** `BE=apps/backend`, `FE=apps/frontend`. Бэкенд-тесты: `npm test -w backend`. Сборка: `npx tsc -p apps/backend/tsconfig.json --noEmit` (BE), `npm run build -w apps/frontend` (FE). У фронтенда нет тест-раннера — проверка через сборку (`tsc`) + ручной прогон.

---

## File Structure

**Новые файлы:**
- `BE/src/modules/training/lib/series-update.ts` — чистая функция `seriesUpdateFields` (какие поля распространяются на серию).
- `BE/src/modules/training/lib/series-update.spec.ts` — юнит-тест.
- `FE/src/entities/trainings/form/use-edit-training.ts` — стейт/логика формы редактирования.
- `FE/src/entities/trainings/form/edit-training-modal.tsx` — презентационная модалка.

**Изменяемые файлы:**
- `BE/src/modules/training/training.service.ts` — метод `updateSeriesForUser`.
- `BE/src/modules/training/training.controller.ts` — маршрут `@Patch('recurring/:recurringId')`.
- `FE/src/entities/trainings/model/trainings.repo.ts` — `isOnline` в `updateTraining` + новая `updateTrainingSeries`.
- `FE/src/entities/trainings/api/use-trainings.ts` — хук `useUpdateTrainingSeries`.
- `FE/src/entities/trainings/index.ts` — экспорт `edit-training-modal`.
- `FE/src/entities/trainings/list/training-list.tsx` — проп `onEdit`.
- `FE/src/entities/trainings/list/training-item.tsx` — проп `onEdit` + кнопка ✏️.
- `FE/src/entities/trainings/form/calendar-training-modal.tsx` — проп `onEdit` + кнопка «Редактировать».
- `FE/src/pages/trainings/use-trainings-page.ts` — `editTarget` + `openEditTraining`.
- `FE/src/pages/trainings/trainings-page.tsx` — рендер `EditTrainingModal`, проброс `onEdit`.
- `FE/src/locales/ru/translation.json`, `FE/src/locales/en/translation.json` — строки.

---

## Task 1: Чистая функция полей серии (TDD, backend)

**Files:**
- Create: `apps/backend/src/modules/training/lib/series-update.ts`
- Test: `apps/backend/src/modules/training/lib/series-update.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/backend/src/modules/training/lib/series-update.spec.ts`:
```ts
import { seriesUpdateFields } from './series-update'

describe('seriesUpdateFields', () => {
  it('берёт только распространяемые поля', () => {
    expect(
      seriesUpdateFields({ time: '19:30', locationId: 'L1', note: 'x', isOnline: true }),
    ).toEqual({ time: '19:30', locationId: 'L1', note: 'x', isOnline: true })
  })

  it('НЕ распространяет дату, группу, состав и прайм на серию', () => {
    const out = seriesUpdateFields({
      time: '19:30',
      date: '2026-06-09',
      groupId: 'g',
      isPrime: true,
    } as never)
    expect(out).toEqual({ time: '19:30' })
    expect('date' in out).toBe(false)
    expect('isPrime' in out).toBe(false)
  })

  it('пропускает поля, которых нет в dto', () => {
    expect(seriesUpdateFields({ note: 'только заметка' })).toEqual({ note: 'только заметка' })
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -w backend -- series-update`
Expected: FAIL — `Cannot find module './series-update'`.

- [ ] **Step 3: Реализация**

Создать `apps/backend/src/modules/training/lib/series-update.ts`:
```ts
export interface SeriesUpdatableFields {
  time?: string
  locationId?: string | null
  note?: string
  isOnline?: boolean
}

export interface SeriesUpdateInput {
  time?: string
  locationId?: string | null
  note?: string
  isOnline?: boolean
  // Принимается, но НЕ распространяется на серию:
  date?: string
  groupId?: string
  isPrime?: boolean
}

/**
 * Поля, распространяемые на ВСЮ серию. Дата сюда не входит — у каждого занятия
 * своя дата. Прайм не копируется: он пересчитывается по дате каждого занятия
 * в `updateSeriesForUser`. Группа/состав учеников не редактируются.
 */
export function seriesUpdateFields(dto: SeriesUpdateInput): SeriesUpdatableFields {
  const out: SeriesUpdatableFields = {}
  if (dto.time !== undefined) out.time = dto.time
  if (dto.locationId !== undefined) out.locationId = dto.locationId
  if (dto.note !== undefined) out.note = dto.note
  if (dto.isOnline !== undefined) out.isOnline = dto.isOnline
  return out
}
```

- [ ] **Step 4: Запустить — должно пройти**

Run: `npm test -w backend -- series-update`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/training/lib/series-update.ts apps/backend/src/modules/training/lib/series-update.spec.ts
git commit -m "feat(backend): чистая функция полей обновления серии тренировок"
```

---

## Task 2: Массовое обновление серии + маршрут (backend)

**Files:**
- Modify: `apps/backend/src/modules/training/training.service.ts`
- Modify: `apps/backend/src/modules/training/training.controller.ts`

- [ ] **Step 1: Метод `updateSeriesForUser` в сервисе**

В `apps/backend/src/modules/training/training.service.ts` добавить импорт вверху (рядом с другими локальными импортами):
```ts
import { seriesUpdateFields, type SeriesUpdateInput } from './lib/series-update'
```
И добавить метод в класс `TrainingService` (после `updateForUser`, перед `markAttendance`):
```ts
/**
 * Обновить все занятия повторяющейся серии. Распространяемые поля (время/локация/
 * заметка/онлайн) применяются ко всем; дата НЕ трогается (у каждого своя). Прайм
 * пересчитывается по дате каждого занятия. На каждое занятие ставится upsert.
 */
async updateSeriesForUser(
  userId: string,
  recurringId: string,
  dto: SeriesUpdateInput,
): Promise<number> {
  const fields = seriesUpdateFields(dto)
  const trainings = await this.trainingModel.findAll({ where: { userId, recurringId } })
  for (const t of trainings) {
    if (fields.time !== undefined) t.time = fields.time
    if (fields.locationId !== undefined) t.locationId = fields.locationId
    if (fields.note !== undefined) t.note = fields.note
    if (fields.isOnline !== undefined) t.isOnline = fields.isOnline
    const location = t.locationId
      ? await this.locationService.findOneForUser(userId, t.locationId).catch(() => null)
      : null
    t.isPrime = isPrimeTime(t.date, t.time, location)
    await t.save()
    await this.calendarSync.enqueueUpsert(userId, t.id, t.time)
  }
  return trainings.length
}
```

- [ ] **Step 2: Маршрут в контроллере (ДО `@Patch(':id')`)**

В `apps/backend/src/modules/training/training.controller.ts` добавить метод **перед** существующим `@Patch(':id')` (порядок важен — литеральный путь должен матчиться раньше параметрического):
```ts
  @Patch('recurring/:recurringId')
  @ApiOperation({ summary: 'Обновить всю серию повторяющихся тренировок' })
  updateSeries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('recurringId') recurringId: string,
    @Body() dto: UpdateTrainingDto,
  ): Promise<{ updated: number }> {
    return this.trainingService
      .updateSeriesForUser(user.id, recurringId, dto)
      .then((updated) => ({ updated }))
  }
```

- [ ] **Step 3: Сборка**

Run: `npx tsc -p apps/backend/tsconfig.json --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Тесты бэкенда не сломаны**

Run: `npm test -w backend`
Expected: PASS (включая series-update и существующие calendar-тесты).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/training/training.service.ts apps/backend/src/modules/training/training.controller.ts
git commit -m "feat(backend): PATCH /trainings/recurring/:recurringId — обновление серии"
```

---

## Task 3: Фронт-репозиторий и хук обновления (frontend)

**Files:**
- Modify: `apps/frontend/src/entities/trainings/model/trainings.repo.ts`
- Modify: `apps/frontend/src/entities/trainings/api/use-trainings.ts`

- [ ] **Step 1: Добавить `isOnline` в `updateTraining`**

В `apps/frontend/src/entities/trainings/model/trainings.repo.ts`, в функции `updateTraining`, после строки с `body.isPrime`:
```ts
  if (changes.isOnline !== undefined) body.isOnline = changes.isOnline
```
(Сейчас `isOnline` не мапится — тумблер «онлайн» иначе не сохранится.)

- [ ] **Step 2: Добавить `updateTrainingSeries`**

В том же файле, после функции `updateTraining`, добавить:
```ts
export async function updateTrainingSeries(
  recurringId: string,
  changes: { time?: string; locationId?: string | null; note?: string; isOnline?: boolean },
): Promise<number> {
  const body: Record<string, unknown> = {}
  if (changes.time !== undefined) body.time = changes.time
  if (changes.locationId !== undefined) body.locationId = changes.locationId
  if (changes.note !== undefined) body.note = changes.note
  if (changes.isOnline !== undefined) body.isOnline = changes.isOnline
  const result = await apiClient.patch<{ updated: number }>(
    `/trainings/recurring/${recurringId}`,
    body,
  )
  return result?.updated ?? 0
}
```

- [ ] **Step 3: Хук `useUpdateTrainingSeries`**

В `apps/frontend/src/entities/trainings/api/use-trainings.ts`:
- в импорт из `entities/trainings/model/trainings.repo` добавить `updateTrainingSeries`:
```ts
import {
  createTraining,
  deleteRecurringSeries,
  deleteTraining,
  getTrainings,
  removeVisitAt,
  updateTraining,
  updateTrainingSeries,
} from 'entities/trainings/model/trainings.repo'
```
- после `useUpdateTraining` добавить:
```ts
export function useUpdateTrainingSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      recurringId,
      changes,
    }: {
      recurringId: string
      changes: { time?: string; locationId?: string | null; note?: string; isOnline?: boolean }
    }) => updateTrainingSeries(recurringId, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.all }),
  })
}
```

- [ ] **Step 4: Сборка фронта**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/entities/trainings/model/trainings.repo.ts apps/frontend/src/entities/trainings/api/use-trainings.ts
git commit -m "feat(frontend): API обновления серии тренировок + isOnline в updateTraining"
```

---

## Task 4: Хук формы `useEditTraining` (frontend)

**Files:**
- Create: `apps/frontend/src/entities/trainings/form/use-edit-training.ts`

- [ ] **Step 1: Реализация хука**

Создать `apps/frontend/src/entities/trainings/form/use-edit-training.ts`:
```ts
import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useUpdateTraining, useUpdateTrainingSeries } from '../api/use-trainings'
import { checkTrainingConflict } from '../model/training-logic'

import type { Training, TrainingConflict } from '../model/types'

interface UseEditTrainingOptions {
  training: Training | null
  onDone: () => void
}

export function useEditTraining({ training, onDone }: UseEditTrainingOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const update = useUpdateTraining()
  const updateSeries = useUpdateTrainingSeries()

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [locationId, setLocationId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [isPrime, setIsPrime] = useState(false)
  const [conflicts, setConflicts] = useState<TrainingConflict[]>([])
  const [scopeOpen, setScopeOpen] = useState(false)

  // Предзаполнение при смене редактируемой тренировки.
  useEffect(() => {
    if (!training) return
    setDate(training.date)
    setTime(training.time)
    setNote(training.note)
    setLocationId(training.locationId)
    setIsOnline(training.isOnline)
    setIsPrime(training.isPrime)
  }, [training])

  const isRecurring = !!training?.recurring && !!training?.recurringId
  const saving = update.isPending || updateSeries.isPending

  // Живая проверка конфликтов, исключая саму тренировку.
  useEffect(() => {
    let active = true
    if (training && date && time) {
      checkTrainingConflict(date, time, training.groupId, training.id).then((c) => {
        if (active) setConflicts(c)
      })
    } else {
      setConflicts([])
    }
    return () => {
      active = false
    }
  }, [training, date, time])

  const saveSingle = async () => {
    if (!training) return
    await update.mutateAsync({
      id: training.id,
      changes: { date, time, locationId, note: note.trim(), isOnline, isPrime },
    })
    toast({ type: 'success', title: t('trainings.edit.saved') })
    onDone()
  }

  const saveSeries = async () => {
    if (!training?.recurringId) return
    // На серию: время/локация/заметка/онлайн. Прайм пересчитает бэкенд по дате
    // каждого занятия. Дата применяется только к открытому занятию.
    await updateSeries.mutateAsync({
      recurringId: training.recurringId,
      changes: { time, locationId, note: note.trim(), isOnline },
    })
    if (date !== training.date) {
      await update.mutateAsync({ id: training.id, changes: { date } })
    }
    toast({ type: 'success', title: t('trainings.edit.seriesSaved') })
    onDone()
  }

  const submit = async () => {
    if (!training) return
    const live = await checkTrainingConflict(date, time, training.groupId, training.id)
    if (live.length) {
      const detail = live.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
      toast({ type: 'error', title: t('trainings.group.scheduleConflict'), msg: detail })
      return
    }
    if (isRecurring) {
      setScopeOpen(true)
      return
    }
    await saveSingle()
  }

  const confirmScope = async (scope: 'single' | 'series') => {
    setScopeOpen(false)
    if (scope === 'series') await saveSeries()
    else await saveSingle()
  }

  return {
    date,
    setDate,
    time,
    setTime,
    note,
    setNote,
    locationId,
    setLocationId,
    isOnline,
    setIsOnline,
    isPrime,
    setIsPrime,
    conflicts,
    saving,
    isRecurring,
    scopeOpen,
    setScopeOpen,
    submit,
    confirmScope,
  }
}
```

- [ ] **Step 2: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок (компонент ещё не использует хук — это нормально).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/use-edit-training.ts
git commit -m "feat(frontend): useEditTraining — стейт и сабмит формы редактирования"
```

---

## Task 5: Модалка `EditTrainingModal` + экспорт + строки (frontend)

**Files:**
- Create: `apps/frontend/src/entities/trainings/form/edit-training-modal.tsx`
- Modify: `apps/frontend/src/entities/trainings/index.ts`
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Компонент модалки**

Создать `apps/frontend/src/entities/trainings/form/edit-training-modal.tsx`:
```tsx
import { Button, Form, Input, Modal, Switch } from 'antd'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'

import { ConflictHint, PrimeHint } from './training-hints'
import { useEditTraining } from './use-edit-training'

import type { Training } from '../model/types'
import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface EditTrainingModalProps {
  open: boolean
  training: Training | null
  onClose: () => void
}

export function EditTrainingModal({ open, training, onClose }: EditTrainingModalProps) {
  const { t } = useTranslation()
  const form = useEditTraining({ training, onDone: onClose })

  if (!training) return null

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('common.save')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={t('trainings.edit.title')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('trainings.edit.dateLabel')}>
            <Input
              type="date"
              value={form.date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => form.setDate(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={t('trainings.edit.timeLabel')}>
            <Input
              type="time"
              value={form.time}
              onChange={(e: ChangeEvent<HTMLInputElement>) => form.setTime(e.target.value)}
            />
          </Form.Item>
        </div>
        <ConflictHint conflicts={form.conflicts} />
        <PrimeHint date={form.date} time={form.time} locationId={form.locationId} />
        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>
        <Form.Item label={t('trainings.edit.noteLabel')}>
          <Input.TextArea
            rows={2}
            value={form.note}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => form.setNote(e.target.value)}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
          <Form.Item label={t('trainings.edit.onlineLabel')}>
            <Switch checked={form.isOnline} onChange={form.setIsOnline} />
          </Form.Item>
          <Form.Item label={t('trainings.edit.primeLabel')}>
            <Switch checked={form.isPrime} onChange={form.setIsPrime} />
          </Form.Item>
        </div>
        {form.isRecurring && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {t('trainings.edit.recurringNote')}
          </p>
        )}
      </Form>

      <Modal
        open={form.scopeOpen}
        title={t('trainings.edit.scopeTitle')}
        onCancel={() => form.setScopeOpen(false)}
        footer={[
          <Button key="single" onClick={() => form.confirmScope('single')}>
            {t('trainings.edit.scopeSingle')}
          </Button>,
          <Button key="series" type="primary" onClick={() => form.confirmScope('series')}>
            {t('trainings.edit.scopeSeries')}
          </Button>,
        ]}
      >
        {t('trainings.edit.scopeBody')}
      </Modal>
    </Modal>
  )
}
```

- [ ] **Step 2: Экспорт из index**

В `apps/frontend/src/entities/trainings/index.ts` добавить строку (рядом с другими `form/`):
```ts
export * from './form/edit-training-modal'
```

- [ ] **Step 3: Строки локализации (ru)**

В `apps/frontend/src/locales/ru/translation.json` внутри объекта `"trainings"` добавить блок `"edit"` (рядом с `"group"`):
```json
    "edit": {
      "title": "Редактировать занятие",
      "dateLabel": "Дата",
      "timeLabel": "Время",
      "noteLabel": "Комментарий (необязательно)",
      "onlineLabel": "Онлайн",
      "primeLabel": "Прайм-тайм",
      "recurringNote": "Это занятие из повторяющейся серии. При сохранении выберите, применить к одному или ко всем; дата меняется только у этого занятия.",
      "scopeTitle": "Применить изменения",
      "scopeBody": "Это повторяющееся занятие. Применить правки только к нему или ко всей серии?",
      "scopeSingle": "Только это занятие",
      "scopeSeries": "Вся серия",
      "saved": "Тренировка обновлена",
      "seriesSaved": "Серия обновлена"
    },
```
И внутри `"trainings"."item"` добавить ключ:
```json
      "edit": "Редактировать"
```
И внутри `"trainings"."cal"` добавить ключ:
```json
      "edit": "Редактировать"
```

- [ ] **Step 4: Строки локализации (en)**

В `apps/frontend/src/locales/en/translation.json` внутри `"trainings"` добавить:
```json
    "edit": {
      "title": "Edit session",
      "dateLabel": "Date",
      "timeLabel": "Time",
      "noteLabel": "Note (optional)",
      "onlineLabel": "Online",
      "primeLabel": "Prime time",
      "recurringNote": "This session is part of a recurring series. On save, choose to apply to one or all; the date changes only for this session.",
      "scopeTitle": "Apply changes",
      "scopeBody": "This is a recurring session. Apply changes to this one only or the whole series?",
      "scopeSingle": "This session only",
      "scopeSeries": "Whole series",
      "saved": "Training updated",
      "seriesSaved": "Series updated"
    },
```
И в `"trainings"."item"`:
```json
      "edit": "Edit"
```
И в `"trainings"."cal"`:
```json
      "edit": "Edit"
```

- [ ] **Step 5: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/edit-training-modal.tsx apps/frontend/src/entities/trainings/index.ts apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(frontend): модалка EditTrainingModal + локализация"
```

---

## Task 6: Точки входа — список и календарь (frontend)

**Files:**
- Modify: `apps/frontend/src/pages/trainings/use-trainings-page.ts`
- Modify: `apps/frontend/src/pages/trainings/trainings-page.tsx`
- Modify: `apps/frontend/src/entities/trainings/list/training-list.tsx`
- Modify: `apps/frontend/src/entities/trainings/list/training-item.tsx`
- Modify: `apps/frontend/src/entities/trainings/form/calendar-training-modal.tsx`

- [ ] **Step 1: Стейт входа в хуке страницы**

В `apps/frontend/src/pages/trainings/use-trainings-page.ts`:
- после строки `const [addTarget, setAddTarget] = useState<Training | null>(null)` добавить:
```ts
  const [editTarget, setEditTarget] = useState<Training | null>(null)
```
- рядом с `openAddStudent` добавить:
```ts
  const openEditTraining = (training: Training) => setEditTarget(training)
```
- в возвращаемый объект (рядом с `addTarget`, `setAddTarget`) добавить:
```ts
    editTarget,
    setEditTarget,
    openEditTraining,
```

- [ ] **Step 2: Проп `onEdit` в списке**

В `apps/frontend/src/entities/trainings/list/training-list.tsx`:
- в интерфейс `TrainingListProps` добавить:
```ts
  onEdit: (training: Training) => void
```
- в деструктуризацию пропсов добавить `onEdit`, и в `<TrainingItem ... />` добавить:
```tsx
          onEdit={onEdit}
```

- [ ] **Step 3: Кнопка ✏️ в карточке**

В `apps/frontend/src/entities/trainings/list/training-item.tsx`:
- добавить иконку в импорт из `@ant-design/icons`:
```ts
  EditOutlined,
```
- в интерфейс `TrainingItemProps` добавить:
```ts
  onEdit: (training: Training) => void
```
- в деструктуризацию добавить `onEdit`, рядом с `handleDelete` добавить:
```ts
  const handleEdit = () => onEdit(training)
```
- в блоке `training-item__actions`, перед `<Popconfirm ...>` (кнопкой удаления), добавить:
```tsx
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title={t('trainings.item.edit')}
            onClick={handleEdit}
          />
```

- [ ] **Step 4: Кнопка «Редактировать» в модалке календаря**

В `apps/frontend/src/entities/trainings/form/calendar-training-modal.tsx`:
- добавить в импорт из `@ant-design/icons`:
```ts
  EditOutlined,
```
- в `CalendarTrainingModalProps` и в проп-тип `CalendarTrainingModalInner` добавить:
```ts
  onEdit: (training: Training) => void
```
- пробросить `onEdit` через внешний компонент в `CalendarTrainingModalInner` (добавить в деструктуризацию и в `<CalendarTrainingModalInner ... onEdit={onEdit} />`).
- в `CalendarTrainingModalInner`, в блоке `if (m.training) { footer.push(...) }`, перед `Popconfirm` удаления добавить ещё один `footer.push`:
```tsx
    footer.push(
      <Button
        key="edit"
        icon={<EditOutlined />}
        onClick={() => {
          if (m.training) {
            onClose()
            onEdit(m.training)
          }
        }}
      >
        {t('trainings.cal.edit')}
      </Button>,
    )
```

- [ ] **Step 5: Рендер `EditTrainingModal` и проброс `onEdit` на странице**

В `apps/frontend/src/pages/trainings/trainings-page.tsx`:
- в импорт из `entities/trainings` добавить `EditTrainingModal`.
- в `<TrainingList ... />` добавить:
```tsx
          onEdit={page.openEditTraining}
```
- в `<CalendarTrainingModal ... />` добавить:
```tsx
        onEdit={page.openEditTraining}
```
- добавить обработчик закрытия рядом с другими `handleClose*`:
```tsx
  const handleCloseEdit = () => page.setEditTarget(null)
```
- перед закрывающим `</div>` (рядом с `CalendarTrainingModal`) добавить:
```tsx
      <EditTrainingModal
        open={!!page.editTarget}
        training={page.editTarget}
        onClose={handleCloseEdit}
      />
```

- [ ] **Step 6: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/pages/trainings/use-trainings-page.ts apps/frontend/src/pages/trainings/trainings-page.tsx apps/frontend/src/entities/trainings/list/training-list.tsx apps/frontend/src/entities/trainings/list/training-item.tsx apps/frontend/src/entities/trainings/form/calendar-training-modal.tsx
git commit -m "feat(frontend): точки входа редактирования — карточка списка и модалка календаря"
```

---

## Task 7: Ручная проверка end-to-end

**Предусловие:** запущены MySQL, бэкенд (3021), фронтенд (3020); подключён Google-календарь (см. предыдущую сессию). Демо-аккаунт `demo@trikick.ru` / `demo1234`.

- [ ] **Step 1: Перезапустить серверы (подхватить изменения)**

Run:
```bash
lsof -ti tcp:3020 -sTCP:LISTEN | xargs kill 2>/dev/null; lsof -ti tcp:3021 -sTCP:LISTEN | xargs kill 2>/dev/null
cd "/Users/StepOne/Desktop/Мой проект" && npm run dev:backend > /tmp/trikick-backend.log 2>&1 &
cd "/Users/StepOne/Desktop/Мой проект" && npm run dev > /tmp/trikick-frontend.log 2>&1 &
```
Expected: оба слушают порты; в логе бэкенда есть маршрут `Mapped {/api/trainings/recurring/:recurringId, PATCH}`.

- [ ] **Step 2: Одиночная правка времени (список)**

Открыть http://localhost:3020 → войти → Тренировки → развернуть будущую тренировку → ✏️ → сменить время → Сохранить.
Expected: тост «Тренировка обновлена»; время изменилось в списке.

- [ ] **Step 3: Проверить upsert в Google**

Run:
```bash
/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick --table -e "SELECT operation, status, attempts FROM calendar_sync_tasks ORDER BY updated_at DESC LIMIT 3;"
```
Expected: свежая `upsert / done / 0`. В Google Календаре событие переехало на новое время (то же событие, без дубля).

- [ ] **Step 4: Конфликт и самоконфликт**

Открыть редактирование, оставить то же время → Сохранить.
Expected: НЕ ругается на конфликт сам с собой (сохраняется). Затем выставить время, пересекающееся с другой тренировкой того же дня → Сохранить → ошибка-тост о конфликте, сохранение заблокировано.

- [ ] **Step 5: Серия — «вся серия» vs «только это»**

Создать повторяющуюся тренировку (если нет) или взять существующую серию. Открыть ✏️ → сменить время → Сохранить → выбрать «Вся серия».
Expected: тост «Серия обновлена»; у всех занятий серии новое время; в `calendar_sync_tasks` несколько свежих `upsert/done`.
Затем у одного занятия серии сменить дату → Сохранить → «Вся серия».
Expected: дата изменилась ТОЛЬКО у открытого занятия; у остальных дата прежняя.

- [ ] **Step 6: Тумблеры онлайн/прайм**

Включить «Онлайн» у занятия → Сохранить → в Google у события место «Онлайн». Переключить «Прайм» вручную → Сохранить → значение сохранилось (видно при повторном открытии).

- [ ] **Step 7: Вход из календаря**

Переключить вид на «Календарь» → кликнуть занятие → в модалке нажать «Редактировать» → форма открылась с предзаполнением → сменить время → Сохранить.
Expected: то же поведение, что из списка.

---

## Notes / ограничения (из спецификации)

- Per-occurrence проверки конфликтов при «вся серия» нет (осознанно).
- Drag-and-drop переноса в календаре нет.
- Прошедшие тренировки редактировать можно.
- Прайм при «вся серия» пересчитывается по дате каждого занятия (ручной тумблер влияет только на одиночную правку).
