import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { newBatchId } from 'common/utils/batch-id'
import { formatDateShort, todayISO } from 'common/utils/date'
import { uuid } from 'common/utils/uuid'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { resolvePricingRule, resolvePricingRuleForOnline, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'
import { studentKeys } from 'entities/students/api/use-students'
import { useStudents } from 'entities/students/api/use-students'
import {
  addSubscription,
  getStudentById,
  linkPaymentToSub,
  updateStudent,
} from 'entities/students/model/students.repo'

import { useCreateTraining } from '../api/use-trainings'
import { checkSeriesConflicts, checkTrainingConflict, isPrimeTime } from '../model/training-logic'
import { weeklySeriesDates } from '../model/weekly-series'

import type { SubscriptionType } from 'entities/students/model/types'

import { SUB_TYPE_TOTALS } from '@trikick/shared'

function today(): string {
  return todayISO()
}

// Метки — ключи subscriptions.add.type_<value> в локалях.
const SUB_OPTIONS: Record<number, SubscriptionType[]> = {
  60: ['1', '4', '8'],
  90: ['1_90', '4_90', '8_90'],
}

type TimeSlot = 'regular' | 'prime'

interface UseIndividualSessionOptions {
  indGroupId: string
  onDone: () => void
  isOnline?: boolean
}

export function useIndividualSession({ indGroupId, onDone, isOnline = false }: UseIndividualSessionOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const createTraining = useCreateTraining()
  const { data: locations = [] } = useLocations()

  const indGroup = groups.find((g) => g.name === indGroupId) ?? null

  const [duration, setDurationState] = useState(60)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('18:00')
  const [subType, setSubType] = useState<SubscriptionType>('1')
  const [recurring, setRecurring] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'subscription' | 'oneoff'>('subscription')
  const [repeatCount, setRepeatCount] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [locationId, setLocationIdState] = useState<string | null>(null)
  const [locationTouched, setLocationTouched] = useState(false)
  const [slot, setSlotState] = useState<TimeSlot>('regular')
  const [slotTouched, setSlotTouched] = useState(false)

  // Default to the individual group's location until the coach overrides it.
  const effectiveLocationId = locationTouched
    ? locationId
    : (indGroup?.locationId ?? null)
  const setLocationId = (id: string | null) => {
    setLocationTouched(true)
    setLocationIdState(id)
  }

  const effectiveLocationForSlot = locations.find((l) => l.id === effectiveLocationId) ?? null
  // Слот тарифа: по умолчанию следует прайм/не-прайм по времени, пока тренер
  // не выберет вручную (тогда возможно расхождение со временем → уведомление).
  const timePrime = isPrimeTime(date, time, effectiveLocationForSlot)
  const effectiveSlot: TimeSlot = slotTouched ? slot : timePrime ? 'prime' : 'regular'
  const setSlot = (next: TimeSlot) => {
    setSlotTouched(true)
    setSlotState(next)
  }

  const setDuration = (next: number) => {
    setDurationState(next)
    setSubType(SUB_OPTIONS[next][0])
  }

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [students],
  )

  const client = students.find((s) => s.id === clientId) ?? null
  const activeSub =
    client?.subscriptions.find(
      (s) => s.groupId === indGroupId && s.isActive && (s.sessionDuration ?? 60) === duration,
    ) ?? null

  const subOptions = SUB_OPTIONS[duration].map((value) => ({
    value,
    label: t(`subscriptions.add.type_${value}`),
  }))

  const { data: conflicts = [] } = useQuery({
    queryKey: ['training-conflict', indGroupId, date, time, duration],
    queryFn: () => checkTrainingConflict(date, time, indGroupId, null, duration),
    enabled: !!date && !!time,
  })

  const handleSetSubType = (value: SubscriptionType) => {
    setSubType(value)
    setRepeatCount(SUB_TYPE_TOTALS[value] ?? 1)
  }

  const submit = async () => {
    if (!clientId || !date) {
      toast({ type: 'error', title: t('trainings.individual.pickClientAndDate') })
      return
    }

    const seriesLen = recurring ? Math.max(1, repeatCount) : 1
    const dates = weeklySeriesDates(date, seriesLen)
    // Проверяем конфликт по КАЖДОЙ дате серии, а не только по первой —
    // иначе будущие занятия серии могут наслоиться на существующие.
    const conflictDates = (
      await checkSeriesConflicts(
        dates.map((d) => ({ date: d, sessionDuration: duration })),
        time,
        indGroupId,
      )
    ).map(formatDateShort)
    if (conflictDates.length) {
      toast({
        type: 'error',
        title: t('trainings.individual.scheduleConflict'),
        msg: conflictDates.join(', '),
      })
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
      const recurringId = seriesLen > 1 ? uuid() : null
      // Один пакет на всю серию (включая одиночное занятие) для журнала действий.
      const batchId = newBatchId()

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
            batchId,
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
          ? await resolvePricingRuleForOnline(pricingLocationId, subTypeToTuple(subType as Exclude<SubscriptionType, 'sub'>, true))
          : await resolvePricingRule(effectiveLocationId, subTypeToTuple(subType as Exclude<SubscriptionType, 'sub'>, true))
        createdSub = await addSubscription(clientId, {
          groupId: indGroupId,
          type: subType,
          createdAt: date,
          sessionDuration: duration,
          validityDays: rule?.validity_days,
          timeSlot: effectiveSlot,
        })
      }

      // Одиночные и будущие занятия серии — плановые: списание с абонемента
      // происходит при отметке посещения, а не при создании занятия.
      const firstPlanned = true
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
        batchId,
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
          batchId,
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

  return {
    sortedStudents,
    duration,
    setDuration,
    clientId,
    setClientId,
    date,
    setDate,
    time,
    setTime,
    subType,
    setSubType: handleSetSubType,
    subOptions,
    recurring,
    setRecurring,
    paymentMode,
    setPaymentMode,
    repeatCount,
    setRepeatCount,
    note,
    setNote,
    locationId: effectiveLocationId,
    setLocationId,
    slot: effectiveSlot,
    setSlot,
    conflicts,
    client,
    activeSub,
    indGroupId,
    saving,
    submit,
  }
}
