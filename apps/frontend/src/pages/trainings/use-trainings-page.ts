import { useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useSafeAction } from 'common/lib/use-safe-action'
import { getMondayOfWeek } from 'common/utils/date'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import {
  ensureIndividualGroup,
  useRemoveFromTraining,
  useTrainingDelete,
  useTrainings,
} from 'entities/trainings'

import type { Training } from 'entities/trainings'
import type { CalendarBlock, CalendarMode } from 'entities/trainings'

export type TrainingsView = 'list' | 'calendar'

export function useTrainingsPage() {
  const { t } = useTranslation()
  const run = useSafeAction()
  const { data: trainings = [], isLoading, isError, refetch } = useTrainings()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const removeFromTraining = useRemoveFromTraining()
  const del = useTrainingDelete()

  const [view, setView] = useState<TrainingsView>('calendar')
  // На мобильном по умолчанию режим «День», недельная сетка — опция.
  const [calMode, setCalMode] = useState<CalendarMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
      ? 'day'
      : 'week',
  )
  const [calDate, setCalDate] = useState(() => new Date())

  // Счётчик подзаголовка в виде «календарь»: записанные занятия недели,
  // в которую попадает опорная дата (и в режиме «День» тоже).
  const weekCount = useMemo(() => {
    const start = getMondayOfWeek(calDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return trainings.filter((tr) => {
      const d = new Date(tr.date + 'T00:00:00')
      return d >= start && d < end
    }).length
  }, [trainings, calDate])

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [indModalOpen, setIndModalOpen] = useState(false)
  const [onlineModalOpen, setOnlineModalOpen] = useState(false)
  const [pairModalOpen, setPairModalOpen] = useState(false)
  const [indGroupId, setIndGroupId] = useState('')

  const [addTarget, setAddTarget] = useState<Training | null>(null)
  const [editTarget, setEditTarget] = useState<Training | null>(null)
  const [calendarBlock, setCalendarBlock] = useState<CalendarBlock | null>(null)

  const openTypeModal = () => setTypeModalOpen(true)

  const pickGroup = () => {
    setTypeModalOpen(false)
    setGroupModalOpen(true)
  }

  /**
   * Контейнер «Индивидуальные» создаётся лениво. Раньше при сбое сети пикер
   * типа уже закрывался, промис уходил в unhandled rejection, и выбор
   * «Индивидуальная / Онлайн / Парная» выглядел мёртвой кнопкой: ни формы,
   * ни ошибки. Теперь пикер закрывается ТОЛЬКО после успешного ответа.
   */
  const pickInd = (open: (v: boolean) => void) => async () => {
    const indGroup = await run(() => ensureIndividualGroup())
    if (!indGroup) return
    setIndGroupId(indGroup.name)
    setTypeModalOpen(false)
    open(true)
  }

  const pickIndividual = pickInd(setIndModalOpen)
  const pickOnline = pickInd(setOnlineModalOpen)
  const pickPair = pickInd(setPairModalOpen)

  const openAddStudent = (training: Training) => setAddTarget(training)
  const openEditTraining = (training: Training) => setEditTarget(training)

  // Снятие с занятия возвращает занятие на абонемент и откатывает авто-платёж:
  // отказ сервера обязан быть виден, раньше он уходил в тишину.
  const handleRemoveStudent = (training: Training, studentId: string) =>
    run(() => removeFromTraining.mutateAsync({ trainingId: training.id, studentId }), {
      success: t('trainings.removedFromTraining'),
    })

  return {
    trainings,
    students,
    groups,
    isLoading,
    isError,
    refetch,
    view,
    setView,
    calMode,
    setCalMode,
    calDate,
    setCalDate,
    weekCount,
    typeModalOpen,
    setTypeModalOpen,
    groupModalOpen,
    setGroupModalOpen,
    indModalOpen,
    setIndModalOpen,
    onlineModalOpen,
    setOnlineModalOpen,
    pairModalOpen,
    setPairModalOpen,
    indGroupId,
    addTarget,
    setAddTarget,
    editTarget,
    setEditTarget,
    openEditTraining,
    calendarBlock,
    setCalendarBlock,
    openTypeModal,
    pickGroup,
    pickIndividual,
    pickOnline,
    pickPair,
    openAddStudent,
    handleRemoveStudent,
    del,
  }
}
