# Авто-оплата при отметке (Часть 2) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** При отметке посещения занятия для ученика без активного абонемента автоматически записывать разовый платёж по тарифу.

**Architecture:** Обёртка `markAttendanceWithPayment` поверх существующего `markAttendance`: после отметки для каждого ученика без активного абонемента на группу зовётся `autoCreatePayment` с типом «1 занятие». `null` (нет тарифа) → тихо пропускаем. В `use-mark-today.ts` оба вызова `markAttendance` заменяются на обёртку.

**Tech Stack:** React + react-query (frontend). Спецификация: `docs/superpowers/specs/2026-06-08-attendance-auto-payment-design.md`.

**Ветка:** `feat/google-calendar-sync` (продолжаем).

**Условные обозначения:** `FE=apps/frontend`. У фронта нет тест-раннера — проверка через сборку `npm run build -w apps/frontend` (это `tsc -b && vite build`, ловит ошибки типов) + ручной прогон. Серверы могут быть запущены в фоне — игнорировать, запускать сборку явно.

---

## File Structure

**Изменяемые (frontend):**
- `apps/frontend/src/entities/trainings/model/training-logic.ts` — новая `markAttendanceWithPayment` рядом с `markAttendance`.
- `apps/frontend/src/pages/home/use-mark-today.ts` — заменить 2 вызова + импорт.

> `markAttendance` экспортируется из barrel `entities/trainings` через `export * from './model/training-logic'`; новая функция экспортируется автоматически — правка `index.ts` НЕ нужна.

---

## Task 1: `markAttendanceWithPayment` в training-logic

**Files:**
- Modify: `apps/frontend/src/entities/trainings/model/training-logic.ts`

- [ ] **Step 1: Добавить импорты**

В `apps/frontend/src/entities/trainings/model/training-logic.ts`, в блок импортов добавить:
```ts
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'

import { isIndividualTraining } from './training-helpers'
```
(`getGroups` из `entities/groups/model/groups.repo` и `getStudentById` из `entities/students/model/students.repo` уже импортированы в этом файле — не дублировать.)

- [ ] **Step 2: Добавить функцию-обёртку**

В том же файле, сразу ПОСЛЕ функции `markAttendance` (после её закрывающей `}` и до `formatSchedule`), добавить:
```ts
/**
 * Отметить посещение и, если у ученика НЕТ активного абонемента на эту группу,
 * записать разовый платёж по тарифу. Платёж не пишется, если абонемент активен
 * (тогда `markAttendance` списал занятие) или если тарифа нет (autoCreatePayment
 * вернёт null). Тип платежа — «1 занятие» (1_90 для 90-минутных).
 */
export async function markAttendanceWithPayment(
  training: Training,
  studentIds: string[],
): Promise<MarkResult[]> {
  const results = await markAttendance(training, studentIds)

  const groups = await getGroups()
  const isInd = isIndividualTraining(training.groupId, groups)
  const type = training.sessionDuration === 90 ? '1_90' : '1'

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

  return results
}
```

- [ ] **Step 3: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов. (Функция ещё не используется — это нормально.)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings/model/training-logic.ts
git commit -m "feat(frontend): markAttendanceWithPayment — разовый платёж при отметке без абонемента"
```

---

## Task 2: Подключить обёртку в «Отметить за сегодня»

**Files:**
- Modify: `apps/frontend/src/pages/home/use-mark-today.ts`

- [ ] **Step 1: Импорт**

В `apps/frontend/src/pages/home/use-mark-today.ts`, в импорте из `entities/trainings` (блок со строками `createTraining, markAttendance, removeAttendee, trainingKeys, useTrainings`) заменить `markAttendance,` на:
```ts
  markAttendanceWithPayment,
```

- [ ] **Step 2: Групповые занятия**

Заменить строку (около строки 158):
```ts
        if (toAdd.length) await markAttendance(training, toAdd)
```
на:
```ts
        if (toAdd.length) await markAttendanceWithPayment(training, toAdd)
```

- [ ] **Step 3: Индивидуальные занятия**

Заменить строку (около строки 171):
```ts
          if (tr) await markAttendance(tr, [ti.studentId])
```
на:
```ts
          if (tr) await markAttendanceWithPayment(tr, [ti.studentId])
```

- [ ] **Step 4: Сборка**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов. (Если ругается на неиспользуемый `markAttendance` — значит остался лишний импорт; убрать.)

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/pages/home/use-mark-today.ts
git commit -m "feat(frontend): авто-оплата при отметке посещения через markAttendanceWithPayment"
```

---

## Task 3: Ручная проверка end-to-end

**Предусловие:** MySQL, бэкенд (3021), фронтенд (3020) запущены. Демо `demo@trikick.ru` / `demo1234`. Перезапустить фронт, чтобы подхватить сборку.

- [ ] **Step 1: Перезапуск фронта**

Run:
```bash
lsof -ti tcp:3020 -sTCP:LISTEN | xargs kill 2>/dev/null
cd "/Users/StepOne/Desktop/Мой проект" && npm run dev > /tmp/trikick-frontend.log 2>&1 &
```
Expected: фронт слушает 3020.

- [ ] **Step 2: Отметка ученика без абонемента (групповое)**

На «Главной» → «Отметить за сегодня» → отметить ученика, у которого НЕТ активного абонемента на группу (или создать такого через «Разово»-серию из Части 1) → Сохранить.
Expected: тост «Посещаемость сохранена». В разделе «Финансы» появился разовый клиентский платёж + расход зала.

- [ ] **Step 3: Проверка в БД (UTC!)**

Run:
```bash
/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick --table -e "SELECT client_payment_type, client_amount, paid_at FROM payments WHERE created_at > (UTC_TIMESTAMP() - INTERVAL 5 MINUTE) ORDER BY created_at DESC;"
```
Expected: свежий платёж типа `single_group`/`single_individual` (или `single_individual_90`).

- [ ] **Step 4: Защита от дублей**

Повторно открыть «Отметить за сегодня» и сохранить без изменений.
Expected: новый платёж НЕ создаётся (платёж пишется только на переход «не был → отмечен»).

- [ ] **Step 5: Ученик с абонементом**

Отметить ученика с активным абонементом.
Expected: занятие списалось с абонемента, платёж НЕ создан.

- [ ] **Step 6: Нет тарифа**

Отметить занятие без абонемента в группе/локации, для которой тариф «1 занятие» не задан.
Expected: отметка прошла, платёж не записан, без ошибок.

---

## Notes / ограничения (из спецификации)

- Снятие отметки не откатывает платёж (ручная корректировка в финансах).
- Платёж пишется по тарифу на момент отметки; задним числом не пересчитывается.
- Онлайн без абонемента → платёж есть, расхода зала нет (autoCreatePayment не пишет зал для онлайна).
