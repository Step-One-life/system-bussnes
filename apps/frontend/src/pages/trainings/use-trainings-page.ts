import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import {
  ensureIndividualGroup,
  useDeleteTrainingWithRestore,
  useRemoveFromTraining,
  useTrainings,
} from 'entities/trainings'

import type { Training } from 'entities/trainings'
import type { CalendarBlock } from 'entities/trainings'

export type TrainingsView = 'list' | 'calendar'

export function useTrainingsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: trainings = [] } = useTrainings()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const removeFromTraining = useRemoveFromTraining()
  const deleteTraining = useDeleteTrainingWithRestore()

  const [view, setView] = useState<TrainingsView>('list')

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [indModalOpen, setIndModalOpen] = useState(false)
  const [indGroupId, setIndGroupId] = useState('')

  const [addTarget, setAddTarget] = useState<Training | null>(null)
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

  const openAddStudent = (training: Training) => setAddTarget(training)

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
    view,
    setView,
    typeModalOpen,
    setTypeModalOpen,
    groupModalOpen,
    setGroupModalOpen,
    indModalOpen,
    setIndModalOpen,
    indGroupId,
    addTarget,
    setAddTarget,
    calendarBlock,
    setCalendarBlock,
    openTypeModal,
    pickGroup,
    pickIndividual,
    openAddStudent,
    handleRemoveStudent,
    handleDelete,
  }
}
