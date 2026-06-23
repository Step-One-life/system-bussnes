import { useMutation, useQueryClient } from '@tanstack/react-query'

import { financeKeys } from 'entities/finance/api/use-finance'
import { studentKeys } from 'entities/students/api/use-students'
import {
  deleteRecurringSeries,
  deleteTraining,
  removeAttendee,
} from 'entities/trainings/model/trainings.repo'

import { trainingKeys } from './use-trainings'

import type { Training } from 'entities/trainings/model/types'

/** Remove a single student from a training; the backend reverts billing. */
export function useRemoveFromTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trainingId, studentId }: { trainingId: string; studentId: string }) => {
      await removeAttendee(trainingId, studentId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      // Бэк откатывает биллинг (удаляет авто-платёж/расход) — обновляем финансы.
      qc.invalidateQueries({ queryKey: financeKeys.payments })
      qc.invalidateQueries({ queryKey: financeKeys.hallCosts })
    },
  })
}

/** Delete a training (or its whole recurring series); the backend reverts billing. */
export function useDeleteTrainingWithRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ training, series }: { training: Training; series: boolean }) => {
      if (series && training.recurringId) {
        await deleteRecurringSeries(training.recurringId)
      } else {
        await deleteTraining(training.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      // Бэк откатывает биллинг удалённых занятий — обновляем финансы.
      qc.invalidateQueries({ queryKey: financeKeys.payments })
      qc.invalidateQueries({ queryKey: financeKeys.hallCosts })
    },
  })
}
