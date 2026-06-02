import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { SUB_TYPE_TOTALS } from '@trikick/shared'

import { useToast } from 'common/ui'
import { todayISO, toLocalISODate } from 'common/utils/date'
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
import { checkTrainingConflict, isPrimeTime } from '../model/training-logic'

import type { SubscriptionType } from 'entities/students/model/types'

function today(): string {
  return todayISO()
}

const SUB_OPTIONS: Record<number, { value: SubscriptionType; label: string }[]> = {
  60: [
    { value: '1', label: 'Разовое посещение' },
    { value: '4', label: '4 занятия' },
    { value: '8', label: '8 занятий' },
  ],
  90: [
    { value: '1_90', label: 'Разовое 1.5ч' },
    { value: '4_90', label: '4 занятия 1.5ч' },
    { value: '8_90', label: '8 занятий 1.5ч' },
  ],
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
    setSubType(SUB_OPTIONS[next][0].value)
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

  const subOptions = SUB_OPTIONS[duration]

  const { data: conflicts = [] } = useQuery({
    queryKey: ['training-conflict', indGroupId, date, time, duration],
    queryFn: () => checkTrainingConflict(date, time, indGroupId, null, duration),
    enabled: !!date && !!time,
  })

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
      const isPrime = isPrimeTime(date, time, effectiveLocation)
      const slotIsPrime = effectiveSlot === 'prime'
      // Online pricing is looked up against the group's location; in-person
      // uses the effective (possibly overridden) location.
      const pricingLocationId = isOnline ? (indGroup?.locationId ?? null) : effectiveLocationId

      let createdSub: Awaited<ReturnType<typeof addSubscription>> = null
      if (!activeSub) {
        // For online sessions: try 'online' pricing rule first, fallback to 'individual'.
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

      const recurringId = recurring ? uuid() : null

      // В рекуррентной серии будущие занятия создаём плановыми (без списания);
      // первое — плановое, только если дата старта в будущем. Иначе первое
      // занятие проводится сейчас и списывается (бэкенд списывает при создании
      // тренировки с этим участником — отдельный markAttendance не нужен).
      const firstPlanned = recurring && date > today()
      await createTraining.mutateAsync({
        date,
        time,
        groupId: indGroupId,
        locationId: isOnline ? null : effectiveLocationId,
        attendees: firstPlanned ? [] : [clientId],
        plannedStudentId: firstPlanned ? clientId : null,
        note: note.trim(),
        isPrime,
        sessionDuration: duration,
        recurring,
        recurringId,
        isOnline,
      })

      // Деньги пишем один раз при продаже абонемента: доход + расход зала на
      // весь пакет по ВЫБРАННОМУ слоту (прайм/обычный), а не по числу занятий.
      // Списание занятий идёт постепенно (подтверждение в «Отметить за сегодня»).
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

      // Уведомление о несовпадении: слот абонемента ≠ прайм/не-прайм по времени.
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

      if (recurring) {
        // Длина серии = число занятий в абонементе (минус первое). Для нового
        // абонемента берём из его типа, для уже активного — из остатка. Будущие
        // занятия — плановые: участник не добавляется, занятие не списывается,
        // финансы не трогаются. Подтверждаются в «Отметить за сегодня».
        const totalSessions = activeSub ? activeSub.remaining : (SUB_TYPE_TOTALS[subType] ?? 1)
        const futureCount = Math.max(0, totalSessions - 1)
        for (let w = 1; w <= futureCount; w++) {
          const fd = new Date(date + 'T00:00:00')
          fd.setDate(fd.getDate() + 7 * w)
          const futureDate = toLocalISODate(fd)
          await createTraining.mutateAsync({
            date: futureDate,
            time,
            groupId: indGroupId,
            locationId: isOnline ? null : effectiveLocationId,
            attendees: [],
            plannedStudentId: clientId,
            note: '',
            isPrime: isPrimeTime(futureDate, time, effectiveLocation),
            sessionDuration: duration,
            recurring: true,
            recurringId,
            isOnline,
          })
        }
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })

      toast({
        type: 'success',
        title: t('trainings.individual.recorded'),
        msg: recurring
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
    setSubType,
    subOptions,
    recurring,
    setRecurring,
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
