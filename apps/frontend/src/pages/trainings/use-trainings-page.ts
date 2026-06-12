import { useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { getMondayOfWeek } from 'common/utils/date'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import {
  ensureIndividualGroup,
  useDeleteTrainingWithRestore,
  useRemoveFromTraining,
  useTrainings,
} from 'entities/trainings'

import type { Training } from 'entities/trainings'
import type { CalendarBlock, CalendarMode } from 'entities/trainings'

export type TrainingsView = 'list' | 'calendar'

export function useTrainingsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: trainings = [], isLoading, isError, refetch } = useTrainings()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const removeFromTraining = useRemoveFromTraining()
  const deleteTraining = useDeleteTrainingWithRestore()

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

  const pickIndividual = async () => {
    setTypeModalOpen(false)
    const indGroup = await ensureIndividualGroup()
    setIndGroupId(indGroup.name)
    setIndModalOpen(true)
  }

  const pickOnline = async () => {
    setTypeModalOpen(false)
    const indGroup = await ensureIndividualGroup()
    setIndGroupId(indGroup.name)
    setOnlineModalOpen(true)
  }

  const pickPair = async () => {
    setTypeModalOpen(false)
    const indGroup = await ensureIndividualGroup()
    setIndGroupId(indGroup.name)
    setPairModalOpen(true)
  }

  const openAddStudent = (training: Training) => setAddTarget(training)
  const openEditTraining = (training: Training) => setEditTarget(training)

  const handleRemoveStudent = async (training: Training, studentId: string) => {
    await removeFromTraining.mutateAsync({ trainingId: training.id, studentId })
    toast({ type: 'info', title: t('trainings.removedFromTraining') })
  }

  const handleDelete = async (training: Training) => {
    const series = training.recurring && !!training.recurringId
    await deleteTraining.mutateAsync({ training, series })
    toast({
      type: 'success',
      title: series ? t('trainings.seriesDeleted') : t('trainings.trainingDeleted'),
    })
  }

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
    handleDelete,
  }
}
