import { useMemo } from 'react'

import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'

import type { Student, Subscription } from 'entities/students'

export interface UnpaidSub {
  student: Student
  sub: Subscription
  groupId: string
  isIndividual: boolean
}

/**
 * Собирает все неоплаченные абонементы по всем ученикам. «Не оплачено» = у
 * абонемента нет finPaymentId — та же логика, что в SubCard (кнопка «Отметить
 * оплату» видна при !anySub.finPaymentId). isIndividual определяется так же,
 * как в student-drawer: группа абонемента входит в список индивидуальных групп.
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
