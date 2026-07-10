import { Input, Select } from 'antd'
import { SearchOutlined, SortAscendingOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import type { SubStatusType } from '../model/types'
import type { StudentSortKey } from './student-sort'
import type { StudentFilter } from './use-student-filter'
import type { ChangeEvent } from 'react'

interface StudentToolbarProps {
  filter: StudentFilter
  onChange: (filter: StudentFilter) => void
  groupNames: string[]
}

export function StudentToolbar({ filter, onChange, groupNames }: StudentToolbarProps) {
  const { t } = useTranslation()

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...filter, search: e.target.value })
  const handleGroupChange = (v: string | undefined) =>
    onChange({ ...filter, group: v ?? '' })
  const handleStatusChange = (v: SubStatusType | undefined) =>
    onChange({ ...filter, status: v ?? '' })
  const handleSortChange = (v: StudentSortKey) => onChange({ ...filter, sort: v })

  return (
    <div className="toolbar">
      <Input
        prefix={<SearchOutlined />}
        placeholder={t('students.filter.searchPlaceholder')}
        allowClear
        style={{ maxWidth: 280 }}
        value={filter.search}
        onChange={handleSearchChange}
      />
      <Select
        style={{ minWidth: 160 }}
        value={filter.group || undefined}
        placeholder={t('students.filter.allGroups')}
        allowClear
        onChange={handleGroupChange}
        options={groupNames.map((g) => ({ value: g, label: g }))}
      />
      <Select
        style={{ minWidth: 160 }}
        value={filter.status || undefined}
        placeholder={t('students.filter.allStatuses')}
        allowClear
        onChange={handleStatusChange}
        options={[
          { value: 'active', label: t('students.filter.statusActive') },
          { value: 'ending', label: t('students.filter.statusEnding') },
          { value: 'expired', label: t('students.filter.statusExpired') },
        ]}
      />
      <Select
        style={{ minWidth: 180 }}
        value={filter.sort}
        onChange={handleSortChange}
        prefix={<SortAscendingOutlined />}
        options={[
          { value: 'name', label: t('students.sort.name') },
          { value: 'problems', label: t('students.sort.problemsFirst') },
          { value: 'lastVisit', label: t('students.sort.lastVisit') },
        ]}
      />
    </div>
  )
}
