import { useMutation, useQueryClient } from '@tanstack/react-query'

import { studentKeys } from 'entities/students/api/use-students'
import { getStudentById, removeVisit, restoreSession } from 'entities/students/model/students.repo'
import {
  deleteRecurringSeries,
  deleteTraining,
  getRecurringSeries,
  getTrainingById,
  updateTraining,
} from 'entities/trainings/model/trainings.repo'

import { trainingKeys } from './use-trainings'

import type { Training } from 'entities/trainings/model/types'

async function restoreAttended(training: Training): Promise<void> {
  for (const sid of training.attendees) {
    const student = await getStudentById(sid)
    const attended = student?.visitHistory.some((v) => v.trainingId === training.id)
    if (attended) {
      await restoreSession(sid, training.groupId)
      await removeVisit(sid, training.id)
    }
  }
}

/** Remove a single student from a training, restoring their session if attended. */
export function useRemoveFromTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ trainingId, studentId }: { trainingId: string; studentId: string }) => {
      const training = await getTrainingById(trainingId)
      if (!training) return
      await updateTraining(trainingId, {
        attendees: training.attendees.filter((id) => id !== studentId),
      })
      const student = await getStudentById(studentId)
      if (student?.visitHistory.some((v) => v.trainingId === trainingId)) {
        await restoreSession(studentId, training.groupId)
        await removeVisit(studentId, trainingId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}

/** Delete a training (or its whole recurring series), restoring attended sessions. */
export function useDeleteTrainingWithRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ training, series }: { training: Training; series: boolean }) => {
      if (series && training.recurringId) {
        const all = await getRecurringSeries(training.recurringId)
        for (const t of all) await restoreAttended(t)
        await deleteRecurringSeries(training.recurringId)
      } else {
        await restoreAttended(training)
        await deleteTraining(training.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}
