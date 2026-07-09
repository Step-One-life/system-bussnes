import { getLastVisitDate } from '../model/students.repo'
import { getOverallSubStatus } from '../model/subscription-status'

import type { Student, SubStatusType } from '../model/types'

export type StudentSortKey = 'name' | 'problems' | 'lastVisit'

/** Чем хуже статус абонемента, тем выше в списке при сортировке «проблемные». */
const STATUS_WEIGHT: Record<SubStatusType, number> = {
  expired: 0,
  danger: 1,
  ending: 2,
  none: 3,
  active: 4,
}

const byName = (a: Student, b: Student) => a.name.localeCompare(b.name)

/** Сортировка списка учеников: алфавит / проблемные первыми / давно не был. */
export function sortStudents(students: Student[], key: StudentSortKey): Student[] {
  const list = [...students]
  if (key === 'name') return list.sort(byName)
  if (key === 'problems') {
    return list.sort(
      (a, b) =>
        STATUS_WEIGHT[getOverallSubStatus(a).type] -
          STATUS_WEIGHT[getOverallSubStatus(b).type] || byName(a, b),
    )
  }
  // lastVisit: дольше всех не появлялся — первым; не был ни разу — раньше всех.
  return list.sort((a, b) => {
    const av = getLastVisitDate(a) ?? ''
    const bv = getLastVisitDate(b) ?? ''
    return av.localeCompare(bv) || byName(a, b)
  })
}
