import { useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { daysBetweenISO, formatDateShort, shiftISODate } from 'common/utils/date'
import { useLocations } from 'entities/locations'

import { useTrainings, useUpdateTraining, useUpdateTrainingSeries } from '../api/use-trainings'
import { checkSeriesConflicts, checkTrainingConflict, isPrimeTime } from '../model/training-logic'

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
  const { data: locations = [] } = useLocations()

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [locationId, setLocationId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [isPrime, setIsPrime] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)

  // Предзаполнение при смене редактируемой тренировки — «adjust state during
  // render» вместо setState в эффекте.
  const [prevTraining, setPrevTraining] = useState<Training | null>(null)
  if (training && training !== prevTraining) {
    setPrevTraining(training)
    setDate(training.date)
    setTime(training.time)
    setNote(training.note)
    setLocationId(training.locationId)
    setIsOnline(training.isOnline)
    setIsPrime(training.isPrime)
  }

  // Прайм следует за временем и локацией: раньше переключатель оставался в
  // старом положении при переносе занятия на вечер, и тренер видел одно, а в
  // авто-платёж уходило другое. Сервер всё равно пересчитывает — здесь важно,
  // чтобы глаза не обманывались.
  const location = locations.find((l) => l.id === locationId) ?? null
  const autoPrime = isPrimeTime(date, time, location)
  const setDateSynced = (v: string) => {
    setDate(v)
    setIsPrime(isPrimeTime(v, time, location))
  }
  const setTimeSynced = (v: string) => {
    setTime(v)
    setIsPrime(isPrimeTime(date, v, location))
  }
  const setLocationSynced = (v: string | null) => {
    setLocationId(v)
    setIsPrime(isPrimeTime(date, time, locations.find((l) => l.id === v) ?? null))
  }

  const isRecurring = !!training?.recurring && !!training?.recurringId
  const saving = update.isPending || updateSeries.isPending

  // Живая проверка конфликтов, исключая саму тренировку. Результат хранится
  // вместе с ключом входов: при их смене показываем пусто (не устаревший
  // список), setState только в колбэке промиса.
  const [conflictResult, setConflictResult] = useState<{
    key: string
    list: TrainingConflict[]
  }>({ key: '', list: [] })
  const conflictKey = training && date && time ? `${training.id}|${date}|${time}` : ''
  useEffect(() => {
    if (!conflictKey || !training) return
    let active = true
    checkTrainingConflict(date, time, training.groupId, training.id).then((c) => {
      if (active) setConflictResult({ key: conflictKey, list: c })
    })
    return () => {
      active = false
    }
  }, [conflictKey, training, date, time])
  const conflicts = conflictKey && conflictResult.key === conflictKey ? conflictResult.list : []

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
    // На серию: время/локация/заметка/онлайн + относительный сдвиг даты — перенос
    // всей серии на другой день недели (каждое занятие сдвигается на ту же дельту).
    // Прайм пересчитает бэкенд по новой дате каждого занятия.
    await updateSeries.mutateAsync({
      recurringId: training.recurringId,
      changes: {
        time,
        locationId,
        note: note.trim(),
        isOnline,
        dateShiftDays: daysBetweenISO(training.date, date),
      },
    })
    toast({ type: 'success', title: t('trainings.edit.seriesSaved') })
    onDone()
  }

  // Ошибка сохранения (например, 409 с бэка) не должна «глотаться» молча —
  // показываем сообщение бэка тостом.
  const showSaveError = (e: unknown) => {
    toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
  }

  const submit = async () => {
    if (!training) return
    // Конфликт проверяется только при реальной смене даты/времени: правка
    // заметки/локации не блокируется давним (до-барьерным) наложением.
    const moved = date !== training.date || time !== training.time
    if (moved) {
      const live = await checkTrainingConflict(date, time, training.groupId, training.id)
      if (live.length) {
        const detail = live.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
        toast({ type: 'error', title: t('trainings.group.scheduleConflict'), msg: detail })
        return
      }
    }
    if (isRecurring) {
      setScopeOpen(true)
      return
    }
    await saveSingle().catch(showSaveError)
  }

  const confirmScope = async (scope: 'single' | 'series') => {
    setScopeOpen(false)
    if (scope === 'series') {
      if (!training?.recurringId) return
      // Перенос/смена времени применяются ко ВСЕЙ серии — проверяем конфликт по
      // каждой её НОВОЙ дате (со сдвигом) и новым временем, исключая сами занятия
      // серии. Без сдвига и без смены времени проверка не нужна (сейв наложений
      // не добавляет).
      const shift = daysBetweenISO(training.date, date)
      if (time !== training.time || shift !== 0) {
        const series = trainings.filter((t) => t.recurringId === training.recurringId)
        const seriesIds = series.map((t) => t.id)
        const conflictDates = (
          await checkSeriesConflicts(
            series.map((s) => ({
              date: shiftISODate(s.date, shift),
              sessionDuration: s.sessionDuration,
            })),
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
      }
      await saveSeries().catch(showSaveError)
    } else {
      await saveSingle().catch(showSaveError)
    }
  }

  return {
    date,
    setDate: setDateSynced,
    time,
    setTime: setTimeSynced,
    note,
    setNote,
    locationId,
    setLocationId: setLocationSynced,
    autoPrime,
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
