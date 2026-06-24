import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addSubscription,
  createStudent,
  deductSession,
  deleteStudent,
  deleteSubscription,
  editSubscription,
  extendSubscription,
  getStudents,
  updateStudent,
} from 'entities/students/model/students.repo'

import type {
  Student,
  StudentInput,
  SubscriptionInput,
} from 'entities/students/model/types'

export const studentKeys = {
  all: ['students', 'all'] as const,
}

export function useStudents() {
  return useQuery({ queryKey: studentKeys.all, queryFn: getStudents })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentInput) => createStudent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Student> }) =>
      updateStudent(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useAddSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: SubscriptionInput }) =>
      addSubscription(studentId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useDeductSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      groupId,
      sessionDuration,
    }: {
      studentId: string
      groupId: string
      sessionDuration?: number | null
    }) => deductSession(studentId, groupId, sessionDuration ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useExtendSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      groupId,
      days,
    }: {
      studentId: string
      groupId: string
      days: number
    }) => extendSubscription(studentId, groupId, days),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useEditSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      subId,
      changes,
    }: {
      studentId: string
      subId: string
      changes: { total?: number; expiresAt?: string; groupIds?: string[] }
    }) => editSubscription(studentId, subId, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, subId }: { studentId: string; subId: string }) =>
      deleteSubscription(studentId, subId),
    onSuccess: () => qc.invalidateQueries({ queryKey: studentKeys.all }),
  })
}
