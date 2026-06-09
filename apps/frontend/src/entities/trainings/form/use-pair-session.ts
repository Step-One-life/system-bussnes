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
    saving,
    submit,
  }
}
