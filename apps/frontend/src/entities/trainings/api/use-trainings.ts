import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { studentKeys } from 'entities/students/api/use-students'
import { markAttendance } from 'entities/trainings/model/training-logic'
import {
  createTraining,
  deleteRecurringSeries,
  deleteTraining,
  getTrainings,
  removeVisitAt,
  updateTraining,
} from 'entities/trainings/model/trainings.repo'

import type { Training, TrainingInput } from 'entities/trainings/model/types'

export const trainingKeys = {
  all: ['trainings', 'all'] as const,
}

export function useTrainings() {
  return useQuery({ queryKey: trainingKeys.all, queryFn: getTrainings })
}

export function useCreateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TrainingInput) => createTraining(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.all }),
  })
}

export function useUpdateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Training> }) =>
      updateTraining(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.all }),
  })
}

export function useDeleteTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTraining(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}

export function useDeleteRecurringSeries() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recurringId: string | null) => deleteRecurringSeries(recurringId),
    onSuccess: () => qc.invalidateQueries({ queryKey: trainingKeys.all }),
  })
}

export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ training, studentIds }: { training: Training; studentIds: string[] }) =>
      markAttendance(training, studentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}

export function useRemoveVisitAt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, index }: { studentId: string; index: number }) =>
      removeVisitAt(studentId, index),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
    },
  })
}
