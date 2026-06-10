import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDateShort } from 'common/utils/date'

import { useTrainings, useUpdateTraining, useUpdateTrainingSeries } from '../api/use-trainings'
import { checkSeriesConflicts, checkTrainingConflict } from '../model/training-logic'

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
  const { data: trainings = [] } = useTrainings()

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
    if (scope === 'series') {
      if (!training?.recurringId) return
      // Смена времени применяется ко ВСЕЙ серии — проверяем конфликт по каждой
      // её дате с новым временем, исключая сами занятия серии.
      const series = trainings.filter((t) => t.recurringId === training.recurringId)
      const seriesIds = series.map((t) => t.id)
      const conflictDates = (
        await checkSeriesConflicts(
          series.map((s) => ({ date: s.date, sessionDuration: s.sessionDuration })),
          time,
          training.groupId,
          seriesIds,
        )
      ).map(formatDateShort)
      if (conflictDates.length) {
        toast({
          type: 'error',
          title: t('trainings.group.scheduleConflict'),
          msg: conflictDates.join(', '),
        })
        return
      }
      await saveSeries()
    } else {
      await saveSingle()
    }
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
