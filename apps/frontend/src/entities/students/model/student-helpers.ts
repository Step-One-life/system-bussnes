import i18n from 'i18next'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import isEmpty from 'lodash/isEmpty'
import join from 'lodash/join'
import map from 'lodash/map'

import type { Student } from './types'

export function getInitials(name: string): string {
  return join(
    map(name.trim().split(/\s+/), (w) => w[0]),
    '',
  )
    .slice(0, 2)
    .toUpperCase()
}

/** Active subscription summary, individual groups labelled "Инд.". */
export function getActiveSubSummary(student: Student, indNames: string[]): string {
  const activeSubs = filter(student.subscriptions, (s) => s.isActive)
  if (isEmpty(activeSubs)) return i18n.t('students.sub.noneActive')
  return join(
    map(activeSubs, (s) => {
      const label = includes(indNames, s.groupId) ? i18n.t('students.indShort') : s.groupId
      return `${label}: ${s.remaining}/${s.total}`
    }),
    ' · ',
  )
}
