import { useMemo } from 'react'

import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { getDaysRemaining } from 'entities/students/model/subscription-status'

import type { Student, Subscription } from 'entities/students'

export interface UnpaidSub {
  student: Student
  sub: Subscription
  groupId: string
  isIndividual: boolean
}

/** Неоплаченный абонемент, истёкший дольше этого срока, скрывается из виджета. */
const UNPAID_EXPIRED_GRACE_DAYS = 30

/**
 * Собирает неоплаченные абонементы по всем ученикам. «Не оплачено» = у
 * абонемента нет finPaymentId — та же логика, что в SubCard (кнопка «Отметить
 * оплату» видна при !anySub.finPaymentId). Истёкшие больше 30 дней назад
 * скрываются (вечный шум); действующие — всегда видны, даже с remaining = 0
 * (отходил неоплаченный абонемент — самый горячий долг). isIndividual
 * определяется так же, как в student-drawer: группа абонемента входит в
 * список индивидуальных групп.
 */
export function useUnpaidSubs() {
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()

  const indNames = useMemo(
    () => groups.filter((g) => g.isIndividual).map((g) => g.name),
    [groups],
  )

  const unpaid: UnpaidSub[] = useMemo(() => {
    const result: UnpaidSub[] = []
    for (const student of students) {
      for (const sub of student.subscriptions) {
        if (sub.finPaymentId) continue
        const days = getDaysRemaining(sub)
        if (days !== null && days < -UNPAID_EXPIRED_GRACE_DAYS) continue
        result.push({
          student,
          sub,
          groupId: sub.groupId,
          isIndividual: indNames.includes(sub.groupId),
        })
      }
    }
    return result
  }, [students, indNames])

  return { unpaid, count: unpaid.length }
}
