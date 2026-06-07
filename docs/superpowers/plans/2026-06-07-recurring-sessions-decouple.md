# Еженедельная серия независимо от абонемента (Часть 1) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать тренеру создавать еженедельную серию индивидуальных занятий заданной длины (поле «повторить N раз»), независимо от абонемента, с режимом оплаты «Абонемент / Разово».

**Architecture:** Меняем только форму индивидуальной сессии. Две независимые оси: режим оплаты (`paymentMode`) и длина серии (`repeatCount`). Длина серии всегда из N. В режиме «Разово» абонемент и платёж не создаются, все занятия плановые. Даты серии — через новый чистый хелпер `weeklySeriesDates`.

**Tech Stack:** React + antd + react-query + i18next. Спецификация: `docs/superpowers/specs/2026-06-07-recurring-sessions-decouple-design.md`.

**Ветка:** `feat/google-calendar-sync` (продолжаем).

**Условные обозначения:** `FE=apps/frontend`. У фронтенда нет тест-раннера — проверка через сборку `npm run build -w apps/frontend` (это `tsc -b && vite build`, ловит ошибки типов) + ручной прогон. Vite dev-сервер может быть запущен в другом процессе — игнорировать, запускать сборку явно.

---

## File Structure

**Новые (frontend):**
- `apps/frontend/src/entities/trainings/model/weekly-series.ts` — чистая `weeklySeriesDates(startISO, count)`.

**Изменяемые (frontend):**
- `apps/frontend/src/entities/trainings/form/use-individual-session.ts` — `paymentMode`, `repeatCount`, переработка `submit`.
- `apps/frontend/src/entities/trainings/form/individual-session-modal.tsx` — переключатель оплаты, поле N, условный показ селектора абонемента.
- `apps/frontend/src/locales/ru/translation.json`, `apps/frontend/src/locales/en/translation.json` — строки.

---

## Task 1: Чистый хелпер дат серии

**Files:**
- Create: `apps/frontend/src/entities/trainings/model/weekly-series.ts`

- [ ] **Step 1: Создать файл**

Создать `apps/frontend/src/entities/trainings/model/weekly-series.ts`:
```ts
/**
 * N дат с недельным шагом от стартовой (ISO YYYY-MM-DD), включая старт.
 * Считаем на UTC, чтобы шаг в 7 дней не «плыл» из-за часового пояса/перехода
 * на летнее время. count < 1 трактуется как 1.
 */
export function weeklySeriesDates(startISO: string, count: number): string[] {
  const n = Math.max(1, Math.floor(count))
  const base = new Date(`${startISO}T00:00:00Z`)
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + 7 * i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов (файл ещё нигде не используется — это нормально).

- [ ] **Step 3: Быстрая ручная проверка логики дат**

Run (проверяем шаг и границу месяца чистым Node, без TS):
```bash
node -e "const b=new Date('2026-06-29T00:00:00Z');for(let i=0;i<3;i++){const d=new Date(b);d.setUTCDate(b.getUTCDate()+7*i);console.log(d.toISOString().slice(0,10))}"
```
Expected: `2026-06-29`, `2026-07-06`, `2026-07-13` (корректный переход через границу месяца).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/entities/trainings/model/weekly-series.ts
git commit -m "feat(frontend): weeklySeriesDates — даты недельной серии"
```

---

## Task 2: Логика формы — режим оплаты, N, переработка submit

**Files:**
- Modify: `apps/frontend/src/entities/trainings/form/use-individual-session.ts`

- [ ] **Step 1: Поправить импорты**

В `apps/frontend/src/entities/trainings/form/use-individual-session.ts`:
- строку `import { todayISO, toLocalISODate } from 'common/utils/date'` заменить на:
```ts
import { todayISO } from 'common/utils/date'
```
(`toLocalISODate` больше не нужен — ручное прибавление недель убираем.)
- после строки `import { checkTrainingConflict, isPrimeTime } from '../model/training-logic'` добавить:
```ts
import { weeklySeriesDates } from '../model/weekly-series'
```

- [ ] **Step 2: Добавить состояние режима оплаты и длины серии**

В теле хука, сразу после строки `const [recurring, setRecurring] = useState(false)` добавить:
```ts
  const [paymentMode, setPaymentMode] = useState<'subscription' | 'oneoff'>('subscription')
  const [repeatCount, setRepeatCount] = useState(1)
```

- [ ] **Step 3: Синхронизировать N с размером абонемента при выборе типа**

Найти место, где `subType`/`setSubType` отдаётся наружу. В возвращаемом объекте сейчас `setSubType` — «сырой» сеттер. Добавить обёртку: перед `return {` хука добавить функцию:
```ts
  const handleSetSubType = (value: SubscriptionType) => {
    setSubType(value)
    setRepeatCount(SUB_TYPE_TOTALS[value] ?? 1)
  }
```

- [ ] **Step 4: Переработать функцию submit**

Заменить **целиком** функцию `submit` (от `const submit = async () => {` до её закрывающей `}` перед `return {`) на:
```ts
  const submit = async () => {
    if (!clientId || !date) {
      toast({ type: 'error', title: t('trainings.individual.pickClientAndDate') })
      return
    }
    const live = await checkTrainingConflict(date, time, indGroupId, null, duration)
    if (live.length) {
      const detail = live.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
      toast({ type: 'error', title: t('trainings.individual.scheduleConflict'), msg: detail })
      return
    }

    setSaving(true)
    try {
      const student = students.find((s) => s.id === clientId)
      if (!student) return

      if (!student.groups.includes(indGroupId)) {
        await updateStudent(clientId, { groups: [...student.groups, indGroupId] })
      }

      const effectiveLocation = locations.find((l) => l.id === effectiveLocationId) ?? null
      const seriesLen = recurring ? Math.max(1, repeatCount) : 1
      const dates = weeklySeriesDates(date, seriesLen)
      const recurringId = seriesLen > 1 ? uuid() : null

      // --- Режим «Разово»: без абонемента и платежа; все занятия плановые. ---
      if (paymentMode === 'oneoff') {
        for (const d of dates) {
          await createTraining.mutateAsync({
            date: d,
            time,
            groupId: indGroupId,
            locationId: isOnline ? null : effectiveLocationId,
            attendees: [],
            plannedStudentId: clientId,
            note: note.trim(),
            isPrime: isPrimeTime(d, time, effectiveLocation),
            sessionDuration: duration,
            recurring: seriesLen > 1,
            recurringId,
            isOnline,
          })
        }
        qc.invalidateQueries({ queryKey: studentKeys.all })
        toast({
          type: 'success',
          title: t('trainings.individual.recorded'),
          msg:
            seriesLen > 1
              ? t('trainings.individual.recordedRecurringMsg', { name: student.name })
              : student.name,
        })
        onDone()
        return
      }

      // --- Режим «Абонемент»: как раньше, но длина серии из dates. ---
      const isPrime = isPrimeTime(date, time, effectiveLocation)
      const slotIsPrime = effectiveSlot === 'prime'
      const pricingLocationId = isOnline ? (indGroup?.locationId ?? null) : effectiveLocationId

      let createdSub: Awaited<ReturnType<typeof addSubscription>> = null
      if (!activeSub) {
        const { rule } = isOnline
          ? await resolvePricingRuleForOnline(pricingLocationId, subTypeToTuple(subType, true))
          : await resolvePricingRule(effectiveLocationId, subTypeToTuple(subType, true))
        createdSub = await addSubscription(clientId, {
          groupId: indGroupId,
          type: subType,
          createdAt: date,
          sessionDuration: duration,
          validityDays: rule?.validity_days,
          timeSlot: effectiveSlot,
        })
      }

      const firstPlanned = seriesLen > 1 && date > today()
      await createTraining.mutateAsync({
        date: dates[0],
        time,
        groupId: indGroupId,
        locationId: isOnline ? null : effectiveLocationId,
        attendees: firstPlanned ? [] : [clientId],
        plannedStudentId: firstPlanned ? clientId : null,
        note: note.trim(),
        isPrime,
        sessionDuration: duration,
        recurring: seriesLen > 1,
        recurringId,
        isOnline,
      })

      if (createdSub) {
        const fin = await autoCreatePayment(
          clientId,
          { id: createdSub.id, type: subType, createdAt: date },
          true,
          { time, isPrime: slotIsPrime, locationId: pricingLocationId, isOnline },
        )
        if (fin) {
          await linkPaymentToSub(clientId, createdSub.id, fin.paymentId)
        } else {
          toast({ type: 'warn', title: t('finance.autoRecord.noTariff') })
        }
      }

      if (slotIsPrime !== isPrime) {
        toast({
          type: 'warn',
          title: t('trainings.individual.primeMismatch', {
            sub: slotIsPrime ? t('finance.markPaid.prime') : t('finance.markPaid.regular'),
            slot: isPrime ? t('finance.markPaid.prime') : t('finance.markPaid.regular'),
          }),
        })
      }

      const fresh = await getStudentById(clientId)
      const usedSub =
        fresh?.subscriptions.find(
          (s) => s.groupId === indGroupId && (s.sessionDuration ?? 60) === duration,
        ) ?? null
      const results: { name: string; status: string; sub: typeof usedSub }[] = usedSub
        ? [
            {
              name: student.name,
              sub: usedSub,
              status: !usedSub.isActive
                ? 'expired'
                : usedSub.remaining <= 2
                  ? 'ending'
                  : 'ok',
            },
          ]
        : []

      // Будущие занятия серии — плановые (без списания). Кол-во из dates.
      for (const fd of dates.slice(1)) {
        await createTraining.mutateAsync({
          date: fd,
          time,
          groupId: indGroupId,
          locationId: isOnline ? null : effectiveLocationId,
          attendees: [],
          plannedStudentId: clientId,
          note: '',
          isPrime: isPrimeTime(fd, time, effectiveLocation),
          sessionDuration: duration,
          recurring: true,
          recurringId,
          isOnline,
        })
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      toast({
        type: 'success',
        title: t('trainings.individual.recorded'),
        msg:
          seriesLen > 1
            ? t('trainings.individual.recordedRecurringMsg', { name: student.name })
            : student.name,
      })

      for (const r of results) {
        if (r.status === 'expired') {
          toast({ type: 'error', title: r.name, msg: t('trainings.addTo.subExpired') })
        } else if (r.status === 'ending') {
          toast({
            type: 'warn',
            title: r.name,
            msg: t('trainings.addTo.remaining', { count: r.sub?.remaining }),
          })
        }
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }
```

- [ ] **Step 5: Расширить возвращаемый объект**

В `return { … }` хука:
- заменить `setSubType,` на `setSubType: handleSetSubType,`
- после строки `setRecurring,` добавить:
```ts
    paymentMode,
    setPaymentMode,
    repeatCount,
    setRepeatCount,
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов. (Если ругается на неиспользуемый `toLocalISODate` — значит импорт не убран в Step 1; убрать.)

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/use-individual-session.ts
git commit -m "feat(frontend): режим оплаты и длина серии N в индивидуальной сессии"
```

---

## Task 3: Модалка — переключатель оплаты, поле N, условный абонемент

**Files:**
- Modify: `apps/frontend/src/entities/trainings/form/individual-session-modal.tsx`

- [ ] **Step 1: Добавить InputNumber в импорт antd**

В первой строке заменить:
```tsx
import { Button, Form, Input, Modal, Segmented, Select } from 'antd'
```
на:
```tsx
import { Button, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd'
```

- [ ] **Step 2: Переключатель «Абонемент / Разово»**

Сразу после закрывающего `</Form.Item>` блока выбора клиента (того, что содержит `clientLabel`/`SubProgressBar`/`noActiveSub`), перед `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', …` (сетка даты/времени) добавить:
```tsx
        <Form.Item label={t('trainings.individual.paymentLabel')}>
          <Segmented
            block
            value={form.paymentMode}
            onChange={(v) => form.setPaymentMode(v as 'subscription' | 'oneoff')}
            options={[
              { label: t('trainings.individual.paymentSubscription'), value: 'subscription' },
              { label: t('trainings.individual.paymentOneoff'), value: 'oneoff' },
            ]}
          />
        </Form.Item>
```

- [ ] **Step 3: Скрывать селектор абонемента в режиме «Разово»**

Найти блок создания нового абонемента и заменить его открывающее условие:
```tsx
        {form.client && !form.activeSub && (
```
на:
```tsx
        {form.client && !form.activeSub && form.paymentMode === 'subscription' && (
```
(Это тот блок, что содержит `newSubLabel` и `slotLabel`.)

- [ ] **Step 4: Поле «повторить N раз» при включённом повторении**

Сразу после закрывающего `</Form.Item>` карточки повторения (та, что содержит `rec-toggle-card` и `weekly`/`weeklyHint`), добавить:
```tsx
        {form.recurring && (
          <Form.Item label={t('trainings.individual.repeatLabel')}>
            <InputNumber
              min={1}
              max={52}
              value={form.repeatCount}
              onChange={(v) => form.setRepeatCount(typeof v === 'number' ? v : 1)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}
```

- [ ] **Step 5: Проверить сборку**

Run: `npm run build -w apps/frontend`
Expected: без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/entities/trainings/form/individual-session-modal.tsx
git commit -m "feat(frontend): UI режима оплаты и поля повторений в модалке сессии"
```

---

## Task 4: Локализация

**Files:**
- Modify: `apps/frontend/src/locales/ru/translation.json`
- Modify: `apps/frontend/src/locales/en/translation.json`

- [ ] **Step 1: Строки (ru)**

В `apps/frontend/src/locales/ru/translation.json`, внутри объекта `"trainings"."individual"`, добавить ключи (рядом с существующими, через запятую — следить за валидностью JSON):
```json
      "paymentLabel": "Оплата",
      "paymentSubscription": "Абонемент",
      "paymentOneoff": "Разово",
      "repeatLabel": "Повторить (раз в неделю), занятий"
```

- [ ] **Step 2: Строки (en)**

В `apps/frontend/src/locales/en/translation.json`, внутри `"trainings"."individual"`, добавить:
```json
      "paymentLabel": "Payment",
      "paymentSubscription": "Subscription",
      "paymentOneoff": "Per session",
      "repeatLabel": "Repeat (weekly), sessions"
```

- [ ] **Step 3: Проверить валидность JSON и сборку**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/ru/translation.json','utf8'));JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/en/translation.json','utf8'));console.log('JSON ok')"
npm run build -w apps/frontend
```
Expected: `JSON ok`, затем сборка без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/locales/ru/translation.json apps/frontend/src/locales/en/translation.json
git commit -m "feat(frontend): строки режима оплаты и повторений"
```

---

## Task 5: Ручная проверка end-to-end

**Предусловие:** запущены MySQL, бэкенд (3021), фронтенд (3020); подключён Google-календарь. Демо-аккаунт `demo@trikick.ru` / `demo1234`. Перезапустить фронт, если нужно подхватить сборку.

- [ ] **Step 1: «Разово» серия N=4**

Тренировки → создать → Индивидуальное → выбрать клиента → **Оплата: Разово** → отметить «повторять» → **Повторить = 4** → дата сегодня → Сохранить.
Expected: в расписании появились 4 плановых занятия с недельным шагом; абонемент НЕ создан; в финансах платежей не прибавилось.

- [ ] **Step 2: Синхронизация серии в Google**

Run:
```bash
/opt/homebrew/opt/mysql/bin/mysql -u trikick -ptrikick trikick --table -e "SELECT operation, status, COUNT(*) n FROM calendar_sync_tasks WHERE created_at > (NOW() - INTERVAL 5 MINUTE) GROUP BY operation, status;"
```
Expected: ~4 свежих `upsert / done`. В Google Календаре — 4 события с недельным шагом.

- [ ] **Step 3: Граница месяца**

Создать «Разово» серию N=3 со стартом `2026-06-29`.
Expected: занятия на `2026-06-29`, `2026-07-06`, `2026-07-13`.

- [ ] **Step 4: «Абонемент» серия**

Создать индивидуальное → **Оплата: Абонемент** → выбрать клиента без активного абонемента → тип «4 занятия» → отметить «повторять» (поле N должно подставиться = 4) → Сохранить.
Expected: создан абонемент + платёж; 4 занятия серии (первое — проведено/списано если сегодня, остальные плановые).

- [ ] **Step 5: «Разово» одно (N=1)**

Создать индивидуальное → Разово → без «повторять» → Сохранить.
Expected: одно плановое занятие; деньги не тронуты; видно в «Отметить за сегодня» (если дата сегодня).

- [ ] **Step 6: Редактирование серии**

Открыть любое занятие «Разово»-серии → ✏️ → сменить время → «Вся серия».
Expected: время поменялось у всех занятий серии (общий `recurringId` работает).

---

## Notes / ограничения (из спецификации)

- Авто-оплата при отметке посещения — **Часть 2** (отдельная спека/план). Сейчас разовый платёж заносится вручную через финансы.
- Конфликты проверяются только для первого занятия серии.
- Групповые тренировки не затрагиваются.
- Кнопка сохранения в режиме «Разово» по-прежнему подписана «Записать и списать» — косметика, вне объёма Части 1.
