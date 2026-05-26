import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { uuid } from 'common/utils/uuid'
import { useGroups } from 'entities/groups/api/use-groups'
import { studentKeys } from 'entities/students/api/use-students'
import { useStudents } from 'entities/students/api/use-students'
import {
  addSubscription,
  getStudentById,
  updateStudent,
} from 'entities/students/model/students.repo'

import { useCreateTraining } from '../api/use-trainings'
import { checkTrainingConflict, isPrimeTime } from '../model/training-logic'

import type { SubscriptionType } from 'entities/students/model/types'

function today(): string {
  return new Date().toISOString().slice(0, 10)
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

interface UseIndividualSessionOptions {
  indGroupId: string
  onDone: () => void
}

export function useIndividualSession({ indGroupId, onDone }: UseIndividualSessionOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const createTraining = useCreateTraining()

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

  // Default to the individual group's location until the coach overrides it.
  const effectiveLocationId = locationTouched
    ? locationId
    : (indGroup?.locationId ?? null)
  const setLocationId = (id: string | null) => {
    setLocationTouched(true)
    setLocationIdState(id)
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

      if (!activeSub) {
        await addSubscription(clientId, {
          groupId: indGroupId,
          type: subType,
          createdAt: date,
          sessionDuration: duration,
        })
      }

      const recurringId = recurring ? uuid() : null

      // The backend deducts the session and records the visit when the
      // training is created with this attendee — no separate markAttendance.
      await createTraining.mutateAsync({
        date,
        time,
        groupId: indGroupId,
        locationId: effectiveLocationId,
        attendees: [clientId],
        note: note.trim(),
        isPrime: isPrimeTime(date, time),
        sessionDuration: duration,
        recurring,
        recurringId,
      })

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
        for (let w = 1; w <= 7; w++) {
          const fd = new Date(date + 'T00:00:00')
          fd.setDate(fd.getDate() + 7 * w)
          const futureDate = fd.toISOString().slice(0, 10)
          await createTraining.mutateAsync({
            date: futureDate,
            time,
            groupId: indGroupId,
            locationId: effectiveLocationId,
            attendees: [clientId],
            note: '',
            isPrime: isPrimeTime(futureDate, time),
            sessionDuration: duration,
            recurring: true,
            recurringId,
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
    conflicts,
    client,
    activeSub,
    indGroupId,
    saving,
    submit,
  }
}
