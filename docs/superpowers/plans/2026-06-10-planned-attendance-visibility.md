# Видимость плановых при отметке (№5/№6) + фильтр «Ожидают оплаты» (№7) — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плановые ученики (`plannedStudentId`/`plannedStudentId2`) видны и отмечаются во всех точках UI (календарная модалка — любой датой, «Отметить сегодня» — независимо друг от друга), а виджет «Ожидают оплаты» не копит вечный шум.

**Architecture:** Только фронтенд. Списки строк отметки строятся как объединение «отмеченные ∪ плановые» с дедупликацией; биллинг и откат уже целиком на бэке (`POST/DELETE /trainings/:id/attendees`). Спека: `docs/superpowers/specs/2026-06-10-planned-attendance-visibility-design.md`.

**Tech Stack:** React + antd + react-query, конвенции: без точек с запятой, одинарные кавычки, отступ 2. Фронтовых unit-тестов в проекте нет — проверка через `npm run build -w apps/frontend` (tsc) и ручной чек-лист из спеки.

**Ветка:** `fix/planned-attendance-visibility` (создана, спека в 90aff37).

---

### Task 1: Фильтр «Ожидают оплаты» (№7)

**Files:**
- Modify: `apps/frontend/src/pages/home/use-unpaid-subs.ts`

- [ ] **Step 1: Добавить фильтр по сроку**

Заменить содержимое файла целиком на:

```ts
import { useMemo } from 'react'

import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { getDaysRemaining } from 'entities/students/model/subscription-status'

import type { Student, Subscription } from 'entities/students'

export interface UnpaidSub {
  student: Student
  sub: Subscription
  groupId: string
  isIndividual: boolean
}

/** Неоплаченный абонемент, истёкший дольше этого срока, скрывается из виджета. */
const UNPAID_EXPIRED_GRACE_DAYS = 30

/**
 * Собирает неоплаченные абонементы по всем ученикам. «Не оплачено» = у
 * абонемента нет finPaymentId — та же логика, что в SubCard (кнопка «Отметить
 * оплату» видна при !anySub.finPaymentId). Истёкшие больше 30 дней назад
 * скрываются (вечный шум); действующие — всегда видны, даже с remaining = 0
 * (отходил неоплаченный абонемент — самый горячий долг). isIndividual
 * определяется так же, как в student-drawer: группа абонемента входит в
 * список индивидуальных групп.
 */
export function useUnpaidSubs() {
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()

  const indNames = useMemo(
    () => groups.filter((g) => g.isIndividual).map((g) => g.name),
    [groups],
  )

  const unpaid: UnpaidSub[] = useMemo(() => {
    const result: UnpaidSub[] = []
    for (const student of students) {
      for (const sub of student.subscriptions) {
        if (sub.finPaymentId) continue
        const days = getDaysRemaining(sub)
        if (days !== null && days < -UNPAID_EXPIRED_GRACE_DAYS) continue
        result.push({
          student,
          sub,
          groupId: sub.groupId,
          isIndividual: indNames.includes(sub.groupId),
        })
      }
    }
    return result
  }, [students, indNames])

  return { unpaid, count: unpaid.length }
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: успех без ошибок tsc.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/home/use-unpaid-subs.ts
git commit -m "fix(frontend): «Ожидают оплаты» скрывает абонементы, истёкшие >30 дней (№7)"
```

---

### Task 2: «Отметить сегодня» — плановые рядом с отмеченными, независимые галочки (№5)

**Files:**
- Modify: `apps/frontend/src/pages/home/use-mark-today.ts`
- Modify: `apps/frontend/src/pages/home/mark-today-modal.tsx`

- [ ] **Step 1: `use-mark-today.ts` — экспортировать ключ строки**

После блока импортов (перед `interface TodayGroup`) добавить:

```ts
/** Ключ галочки индивидуальной строки: у парного занятия один trainingId на двоих. */
export const indKey = (trainingId: string, studentId: string) => `${trainingId}:${studentId}`
```

- [ ] **Step 2: `use-mark-today.ts` — одна ветка построения строк**

Заменить тело цикла `for (const tr of todayTrs) { ... }` в `todayIndividuals` (три ветки `if (tr.attendees.length)` / `else if (tr.isPair)` / `else if (tr.plannedStudentId)`) на:

```ts
      for (const tr of todayTrs) {
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
```

- [ ] **Step 3: `use-mark-today.ts` — составной ключ в initChecks/toggleInd/save**

В `initChecks` заменить:

```ts
    const initInd: Record<string, boolean> = {}
    for (const ti of todayIndividuals) {
      initInd[indKey(ti.trainingId, ti.studentId)] = ti.originalPresent
    }
    setIndChecks(initInd)
```

`toggleInd` заменить на:

```ts
  const toggleInd = (trainingId: string, studentId: string) => {
    const key = indKey(trainingId, studentId)
    setIndChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }
```

В `save` (цикл по `todayIndividuals`) заменить чтение галочки:

```ts
        const isChecked = indChecks[indKey(ti.trainingId, ti.studentId)] ?? ti.originalPresent
```

- [ ] **Step 4: `mark-today-modal.tsx` — ключи и обработчики на пару**

Импорт: `import { indKey, useMarkToday } from './use-mark-today'`.

В рендере `todayIndividuals.map((ti) => { ... })` заменить:

```ts
                  const checked =
                    indChecks[indKey(ti.trainingId, ti.studentId)] ?? ti.originalPresent
```

и в JSX строки:

```tsx
                    <label
                      key={indKey(ti.trainingId, ti.studentId)}
                      className={`mark-row${checked ? ' mark-row--checked' : ''}`}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleInd(ti.trainingId, ti.studentId)}
                      />
```

(остальное в строке без изменений)

- [ ] **Step 5: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: успех. Других потребителей `toggleInd` нет (только модалка).

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/pages/home/use-mark-today.ts apps/frontend/src/pages/home/mark-today-modal.tsx
git commit -m "fix(frontend): «Отметить сегодня» — плановые видны всегда, галочки пары независимы (№5)"
```

---

### Task 3: Календарная модалка — чекбоксы для индивидуальных/парных (№6)

**Files:**
- Modify: `apps/frontend/src/entities/trainings/form/use-calendar-training.ts`
- Modify: `apps/frontend/src/entities/trainings/form/calendar-training-modal.tsx`

- [ ] **Step 1: `use-calendar-training.ts` — indRows из отмеченных ∪ плановых**

Заменить блок `const indRows: AttendRow[] = (training?.attendees ?? []).map(...)` на:

```ts
  // Отмеченные ∪ плановые: плановое занятие видно и отмечается из календаря
  // любой датой (биллинг на бэке, paid_at = дата занятия).
  const indIds = useMemo(() => {
    if (!training) return []
    const planned = [training.plannedStudentId, training.plannedStudentId2].filter(
      (id): id is string => !!id,
    )
    return [...new Set([...training.attendees, ...planned])]
  }, [training])

  const indRows: AttendRow[] = indIds.map((id) => {
    const s = students.find((st) => st.id === id)
    return {
      studentId: id,
      name: s?.name ?? t('trainings.item.deleted'),
      subLine: s ? buildSubLine(s, block.groupId) : '',
      status: s ? getSubStatus(s, block.groupId) : { label: '—', type: 'none' },
    }
  })
```

- [ ] **Step 2: `use-calendar-training.ts` — toRemove от attendeeSet, убрать removeAttendee**

В `saveAttendance` заменить вычисление `toRemove`:

```ts
      const toRemove = [...attendeeSet].filter((id) => !checked.has(id))
```

(вместо вычисления от `groupRows` — та формула не работала для индивидуальных; для групповых эквивалентна, т.к. `checked` инициализируется из `attendees`).

Удалить целиком функцию `const removeAttendee = async (studentId: string) => { ... }` и убрать `removeAttendee` из возвращаемого объекта хука. Импорты `removeAttendeeApi`, `studentKeys` остаются — используются в `saveAttendance`.

- [ ] **Step 3: `calendar-training-modal.tsx` — ветка isInd на чекбоксы**

Удалить `handleRemoveAttendee`. Заменить рендер ветки `m.isInd` на:

```tsx
        {m.isInd ? (
          <div className="cal-attend-list">
            {m.indRows.length ? (
              m.indRows.map((row) => (
                <RowItem
                  key={row.studentId}
                  row={row}
                  checkbox
                  checked={m.checked.has(row.studentId)}
                  onToggle={handleToggleAttendee(row.studentId)}
                />
              ))
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {t('trainings.cal.noStudents')}
              </p>
            )}
          </div>
        ) : (
```

(групповая ветка без изменений)

- [ ] **Step 4: `calendar-training-modal.tsx` — кнопка «Сохранить» в футере индивидуальных**

Заменить блок `if (m.isInd) { footer.push(...) } else { footer.push(...) }` на:

```tsx
  footer.push(
    <Button key="save" type="primary" loading={m.saving} onClick={m.saveAttendance}>
      {t('common.save')}
    </Button>,
  )
  if (m.isInd) {
    footer.push(
      <Button
        key="add"
        icon={<UserAddOutlined />}
        disabled={!m.training}
        onClick={handleAddStudent}
      >
        {t('common.add')}
      </Button>,
    )
  }
```

(«Сохранить» — primary для обоих типов; «Добавить» теряет `type="primary"`. Импорт `CloseOutlined` в модалке не трогать — его использует `RowItem` для `onRemove`, проп остаётся в компоненте.)

- [ ] **Step 5: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: успех; tsc поймает забытые ссылки на удалённый `removeAttendee`.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/use-calendar-training.ts apps/frontend/src/entities/trainings/form/calendar-training-modal.tsx
git commit -m "fix(frontend): календарная модалка — чекбоксы и плановые для индив./парных, отметка любой датой (№6)"
```

---

### Task 4: Gate и ручная проверка

- [ ] **Step 1: Полный gate**

Run:
```bash
npm run build -w apps/frontend
npm run build -w apps/backend
npm test -w apps/backend
```
Expected: обе сборки зелёные, 30 jest-тестов бэка проходят (фронт их не трогал).

- [ ] **Step 2: Ручной чек-лист из спеки (§5) на демо-аккаунте**

Сервера: бэк `npm run start:dev -w apps/backend` (порт 3021), фронт `npm run dev` (3020), вход `demo@trikick.ru` / `demo1234`. Сценарии 1–7 из спеки (парное наполовину; плановое задним числом; снятие галочки с откатом; парное в календаре по одному; групповые без регрессии; истёкший >30 дней скрыт; действующий с remaining=0 виден).
