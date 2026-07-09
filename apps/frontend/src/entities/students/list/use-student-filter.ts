import { useMemo, useState } from 'react'

import lodashFilter from 'lodash/filter'
import includes from 'lodash/includes'

import { phoneDigits } from 'common/utils/phone-links'

import { getOverallSubStatus } from '../model/subscription-status'
import { sortStudents } from './student-sort'

import type { StudentSortKey } from './student-sort'
import type { Student, SubStatusType } from '../model/types'

export interface StudentFilter {
  group: string
  status: '' | SubStatusType
  search: string
  sort: StudentSortKey
}

const EMPTY_FILTER: StudentFilter = { group: '', status: '', search: '', sort: 'name' }

/** Запрос из цифр ищет и по телефону («8999…» найдёт «+7 999…»). */
function matchesSearch(s: Student, q: string): boolean {
  if (includes(s.name.toLowerCase(), q)) return true
  const qDigits = phoneDigits(q)
  return !!qDigits && !!s.phone && includes(phoneDigits(s.phone), qDigits)
}

export function useStudentFilter(students: Student[]) {
  const [filter, setFilter] = useState<StudentFilter>(EMPTY_FILTER)

  const filtered = useMemo(() => {
    let list = students
    if (filter.group) list = lodashFilter(list, (s) => includes(s.groups, filter.group))
    if (filter.search) {
      const q = filter.search.toLowerCase()
      list = lodashFilter(list, (s) => matchesSearch(s, q))
    }
    if (filter.status) {
      list = lodashFilter(list, (s) => getOverallSubStatus(s).type === filter.status)
    }
    return sortStudents(list, filter.sort)
  }, [students, filter])

  const hasActiveFilter = !!(filter.group || filter.search || filter.status)

  return { filter, setFilter, filtered, hasActiveFilter }
}
