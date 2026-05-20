import { useMemo, useState } from 'react'

import lodashFilter from 'lodash/filter'
import includes from 'lodash/includes'

import { getOverallSubStatus } from '../model/subscription-status'

import type { Student, SubStatusType } from '../model/types'

export interface StudentFilter {
  group: string
  status: '' | SubStatusType
  search: string
}

const EMPTY_FILTER: StudentFilter = { group: '', status: '', search: '' }

export function useStudentFilter(students: Student[]) {
  const [filter, setFilter] = useState<StudentFilter>(EMPTY_FILTER)

  const filtered = useMemo(() => {
    let list = students
    if (filter.group) list = lodashFilter(list, (s) => includes(s.groups, filter.group))
    if (filter.search) {
      const q = filter.search.toLowerCase()
      list = lodashFilter(list, (s) => includes(s.name.toLowerCase(), q))
    }
    if (filter.status) {
      list = lodashFilter(list, (s) => getOverallSubStatus(s).type === filter.status)
    }
    return list
  }, [students, filter])

  const hasActiveFilter = !!(filter.group || filter.search || filter.status)

  return { filter, setFilter, filtered, hasActiveFilter }
}
