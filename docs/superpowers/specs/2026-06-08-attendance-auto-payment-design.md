# Авто-оплата при отметке (Часть 2) — дизайн

**Дата:** 2026-06-08
**Статус:** утверждён дизайн, ожидает вычитки спецификации
**Ветка:** `feat/google-calendar-sync` (продолжаем)

## 1. Цель

При отметке посещения занятия для ученика **без активного абонемента** автоматически
записывать разовый платёж по тарифу (клиентский платёж + расход зала). Сейчас отметка
без абонемента просто фиксирует визит — деньги в финансы не попадают. Это Часть 2 к
Части 1 (еженедельные серии без абонемента), которая создавала плановые занятия, но
оплату оставляла на ручной ввод.

## 2. Решения (итог брейншторма)

| Вопрос | Решение |
|---|---|
| Триггер | При отметке (переход «не был → отмечен») для ученика без активного абонемента на группу. Групповые и индивидуальные. |
| Защита от дублей | Платёж только на переход `toAdd` (как сейчас зовётся `markAttendance`), не при каждом сохранении. |
| Нет тарифа | `autoCreatePayment` вернул `null` → тихо пропустить (без тоста). |
| Подход | Обёртка `markAttendanceWithPayment` поверх существующего `markAttendance` (Подход A). |

## 3. Что НЕ входит

- Изменение `markAttendance` (не трогаем — обёртка поверх).
- Возврат/откат платежа при снятии отметки (отдельная задача, если понадобится).
- Платёж для занятий с активным абонементом (там списывается занятие, как сейчас).

## 4. Где живёт логика

Новая функция в `apps/frontend/src/entities/trainings/model/training-logic.ts`, рядом с
существующим `markAttendance`:

```ts
markAttendanceWithPayment(training, studentIds):
  1. await markAttendance(training, studentIds)   // как сейчас
  2. const groups = await getGroups()
     const isInd = isIndividualTraining(training.groupId, groups)
     for (const sid of studentIds):
       const student = await getStudentById(sid)
       const hasActive = student?.subscriptions.some(
         s => s.groupId === training.groupId && s.isActive)
       if (hasActive) continue            // абонемент списан — платёж не пишем
       const type = training.sessionDuration === 90 ? '1_90' : '1'
       await autoCreatePayment(
         sid,
         { id: '', type, createdAt: training.date },
         isInd,
         { time: training.time, locationId: training.locationId, isOnline: training.isOnline },
       )                                  // null → тихо пропускаем
```

`autoCreatePayment` сам определяет прайм по времени (если `isPrime` не передан),
резолвит тариф по локации, создаёт расход зала для очных и пропускает его для онлайна,
и возвращает `null` если тарифа нет.

## 5. Точка врезки

`apps/frontend/src/pages/home/use-mark-today.ts`, функция `save()`: заменить **оба**
вызова `markAttendance` на `markAttendanceWithPayment`:
- групповые (сейчас `if (toAdd.length) await markAttendance(training, toAdd)`),
- индивидуальные (сейчас `if (tr) await markAttendance(tr, [ti.studentId])`).

Обновить импорт в `use-mark-today.ts`: `markAttendance` → `markAttendanceWithPayment`.
Больше в `save()` ничего не меняется (логика `toAdd`/перехода уже даёт защиту от дублей).

## 6. Детали определения

- **Свежие данные:** `getStudentById` читается ПОСЛЕ `markAttendance`, поэтому списание
  уже отражено — проверка `isActive` корректна.
- **«Нет активного абонемента»:** `!subscriptions.some(s => s.groupId === training.groupId && s.isActive)`.
  `training.groupId` хранится как имя группы; `subscription.groupId` — тоже имя (так в
  существующем коде, напр. `use-individual-session` сравнивает `s.groupId === indGroupId`).
- **Тип разового платежа:** `'1_90'` при `sessionDuration === 90`, иначе `'1'`. `autoCreatePayment`
  через `subPaymentType` маппит в `single_individual`/`single_group`/`single_individual_90`.
- **Онлайн:** `training.isOnline` → `autoCreatePayment` не создаёт расход зала.

## 7. Файлы

**Изменяемые (frontend):**
- `apps/frontend/src/entities/trainings/model/training-logic.ts` — новая `markAttendanceWithPayment`
  (+ импорт `autoCreatePayment` из `entities/finance/lib/auto-payment`, `getGroups` и
  `getStudentById` уже импортированы, `isIndividualTraining` из `./training-helpers`).
- `apps/frontend/src/entities/trainings/index.ts` — экспорт `markAttendanceWithPayment`
  (если `markAttendance` экспортируется оттуда; проверить barrel).
- `apps/frontend/src/pages/home/use-mark-today.ts` — заменить 2 вызова + импорт.

## 8. Тестирование

Фронт без тест-раннера → сборка (`npm run build -w apps/frontend`) + ручной прогон:
- Ученик **без абонемента**, групповое → в «Финансах» появился разовый платёж + расход
  зала; повторное сохранение дубль не создаёт.
- Ученик **с абонементом** → списалось занятие, платёж НЕ создан.
- Индивидуальное 90 мин без абонемента → платёж типа `1_90`.
- Онлайн без абонемента → платёж есть, расхода зала нет.
- Нет тарифа для разового → отметка прошла, платёж не записан, без ошибок.

## 9. Открытые ограничения (осознанно)

- Снятие отметки не откатывает платёж (ручная корректировка в финансах).
- Платёж пишется по тарифу на момент отметки; задним числом не пересчитывается.
