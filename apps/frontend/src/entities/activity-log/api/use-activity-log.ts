import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { financeKeys } from 'entities/finance'
import { studentKeys } from 'entities/students'
import { trainingKeys } from 'entities/trainings'

import { getActivityLog, undoBatch, undoEvent } from '../model/activity-log.repo'

export const activityKeys = {
  all: ['activity-log'] as const,
}

export function useActivityLog() {
  return useInfiniteQuery({
    queryKey: activityKeys.all,
    queryFn: ({ pageParam }) => getActivityLog(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  })
}

/** Инвалидация всего, что мог затронуть откат: журнал + визиты + ученики + финансы. */
function useInvalidateAfterUndo() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: activityKeys.all })
    qc.invalidateQueries({ queryKey: trainingKeys.all })
    qc.invalidateQueries({ queryKey: studentKeys.all })
    qc.invalidateQueries({ queryKey: financeKeys.payments })
    qc.invalidateQueries({ queryKey: financeKeys.hallCosts })
  }
}

export function useUndoEvent() {
  const invalidate = useInvalidateAfterUndo()
  return useMutation({
    mutationFn: (id: string) => undoEvent(id),
    onSuccess: invalidate,
  })
}

export function useUndoBatch() {
  const invalidate = useInvalidateAfterUndo()
  return useMutation({
    mutationFn: (batchId: string) => undoBatch(batchId),
    onSuccess: invalidate,
  })
}
