import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { studentKeys, useDeleteStudent, useDeleteSubscription } from '../api/use-students'
import { deductSession, recordVisit } from '../model/students.repo'

export function useStudentActions(onAfterChange: () => void) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const deleteStudent = useDeleteStudent()
  const deleteSubscription = useDeleteSubscription()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: studentKeys.all })
    onAfterChange()
  }

  const deduct = async (studentId: string, groupId: string) => {
    const { sub, status } = await deductSession(studentId, groupId)
    if (!sub) return
    await recordVisit(studentId, {
      date: new Date().toISOString().slice(0, 10),
      groupId,
      trainingId: '',
    })
    const msg =
      status === 'expired'
        ? t('students.actions.subExpired')
        : t('students.actions.remaining', { remaining: sub.remaining, total: sub.total })
    toast({
      type: status === 'expired' ? 'warn' : 'success',
      title: t('students.actions.sessionDeducted'),
      msg,
    })
    invalidate()
  }

  const removeSubscription = async (studentId: string, subId: string) => {
    await deleteSubscription.mutateAsync({ studentId, subId })
    toast({ type: 'success', title: t('students.actions.subDeleted') })
    onAfterChange()
  }

  const removeStudent = async (studentId: string) => {
    await deleteStudent.mutateAsync(studentId)
    toast({ type: 'success', title: t('students.actions.studentDeleted') })
  }

  return { deduct, removeSubscription, removeStudent }
}
