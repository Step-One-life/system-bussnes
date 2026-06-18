import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { newBatchId } from 'common/utils/batch-id'
import { formatDateShort, todayISO } from 'common/utils/date'
import { uuid } from 'common/utils/uuid'
import { usePricingRules } from 'entities/finance/api/use-finance'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'
import { studentKeys, useStudents } from 'entities/students/api/use-students'
import { addSubscription, linkPaymentToSub } from 'entities/students/model/students.repo'
import { findSubForGroup, subLabel } from 'entities/students/model/subscription-status'

import { useCreateTraining } from '../api/use-trainings'
import { checkSeriesConflicts, isPrimeTime } from '../model/training-logic'
import { weeklySeriesDates } from '../model/weekly-series'

import type { RuleTuple } from 'entities/finance/lib/pricing-lookup'

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
  const [issueSub, setIssueSub] = useState(false)
  const [subRuleId, setSubRuleId] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveLocationId = locationTouched ? locationId : (indGroup?.locationId ?? null)
  const setLocationId = (id: string | null) => {
    setLocationTouched(true)
    setLocationIdState(id)
  }

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  // Тарифы парных абонементов локации — для опциональной выдачи при создании сессии.
  const { data: pairRules = [] } = usePricingRules(effectiveLocationId ?? '')
  const subOptions = [...pairRules]
    .filter((r) => r.active && r.lesson_kind === 'pair' && r.format === 'subscription')
    .sort((a, b) => a.sessions_count - b.sessions_count)
  const selectedSubRule = subOptions.find((r) => r.id === subRuleId) ?? subOptions[0] ?? null
  const subLabelFor = (sessions: number, dur: number) => subLabel({ total: sessions, sessionDuration: dur })

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
        title: t('trainings.pair.scheduleConflict'),
        msg: conflictDates.join(', '),
      })
      return
    }

    setSaving(true)
    try {
      const effectiveLocation = locations.find((l) => l.id === effectiveLocationId) ?? null
      const recurringId = seriesLen > 1 ? uuid() : null
      // Опциональная выдача парного абонемента каждому из двух учеников, у кого
      // ещё нет активного парного абонемента (выдаём один раз, не на каждое занятие).
      if (issueSub && selectedSubRule) {
        const rule = selectedSubRule
        const tuple: RuleTuple = {
          lessonKind: 'pair',
          format: 'subscription',
          durationMinutes: rule.duration_minutes,
          sessionsCount: rule.sessions_count,
        }
        for (const clientId of [clientA, clientB]) {
          const student = students.find((s) => s.id === clientId) ?? null
          if (student && findSubForGroup(student, indGroupId, null, true)) continue
          const createdSub = await addSubscription(clientId, {
            groupId: indGroupId,
            type: 'sub',
            sessionsTotal: rule.sessions_count,
            sessionDuration: rule.duration_minutes,
            validityDays: rule.validity_days,
            timeSlot: 'regular',
            isPair: true,
          })
          if (createdSub) {
            const fin = await autoCreatePayment(
              clientId,
              { id: createdSub.id, type: 'sub', createdAt: date, tuple, sessionsTotal: rule.sessions_count },
              false,
              { isPrime: false, locationId: effectiveLocationId },
            )
            if (fin) await linkPaymentToSub(clientId, createdSub.id, fin.paymentId)
          }
        }
      }

      // Один пакет на всю серию (включая одиночное занятие) для журнала действий.
      const batchId = newBatchId()
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
          batchId,
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
    sortedStudents,
    duration,
    setDuration,
    clientA,
    setClientA,
    clientB,
    setClientB,
    date,
    setDate,
    time,
    setTime,
    recurring,
    setRecurring,
    repeatCount,
    setRepeatCount,
    note,
    setNote,
    locationId: effectiveLocationId,
    setLocationId,
    issueSub,
    setIssueSub,
    subRuleId,
    setSubRuleId,
    subOptions,
    selectedSubRule,
    subLabelFor,
    saving,
    submit,
  }
}
