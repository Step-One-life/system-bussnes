import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useSafeAction } from 'common/lib/use-safe-action'
import { useToast } from 'common/ui'
import { invalidateAfterBilling } from 'entities/finance/api/use-finance'

import { studentKeys, useDeleteStudent, useDeleteSubscription } from '../api/use-students'
import { deductSessionById } from '../model/students.repo'

export function useStudentActions(onAfterChange: () => void) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const run = useSafeAction()
  const deleteStudent = useDeleteStudent()
  const deleteSubscription = useDeleteSubscription()
  // Списание пишет деньги: пока запрос в полёте, кнопка должна быть заблокирована.
  const [busy, setBusy] = useState(false)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: studentKeys.all })
    onAfterChange()
  }

  // Списание адресное: карточка передаёт id СВОЕГО абонемента (эвристика по
  // группе списывала не с того при нескольких активных абонементах группы).
  // Отказ сервера показывается тостом — раньше промис отваливался молча.
  const deduct = (studentId: string, subId: string) => {
    setBusy(true)
    return run(async () => {
      const { sub } = await deductSessionById(studentId, subId)
      if (!sub) throw new Error(t('students.actions.subNotFound'))
      return sub
    }).then((sub) => {
      setBusy(false)
      if (!sub) return
      const expired = !sub.isActive
      toast({
        type: expired ? 'warn' : 'success',
        title: t('students.actions.sessionDeducted'),
        msg: expired
          ? t('students.actions.subExpired')
          : t('students.actions.remaining', { remaining: sub.remaining, total: sub.total }),
      })
      // Списание может списать не с абонемента, а записать разовый платёж.
      invalidateAfterBilling(qc)
      invalidate()
    })
  }

  const removeSubscription = (studentId: string, subId: string) =>
    run(() => deleteSubscription.mutateAsync({ studentId, subId }), {
      success: t('students.actions.subDeleted'),
    }).then(() => onAfterChange())

  /** Возвращает true, если ученик действительно удалён (шторку можно закрывать). */
  const removeStudent = async (studentId: string): Promise<boolean> => {
    const done = await run(() => deleteStudent.mutateAsync(studentId), {
      success: t('students.actions.studentDeleted'),
    })
    return done !== undefined
  }

  return { deduct, removeSubscription, removeStudent, busy }
}
