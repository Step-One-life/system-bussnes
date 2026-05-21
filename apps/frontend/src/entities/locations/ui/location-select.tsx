import { Select } from 'antd'

import filter from 'lodash/filter'
import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { useLocations } from '../api/use-locations'

interface LocationSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  allowClear?: boolean
}

/** Reusable location picker. Lists non-archived locations. */
export function LocationSelect({ value, onChange, allowClear = true }: LocationSelectProps) {
  const { t } = useTranslation()
  const { data: locations = [] } = useLocations()

  const active = filter(locations, (l) => !l.archived)

  const handleChange = (next: string | undefined) => onChange(next ?? null)

  return (
    <Select
      style={{ width: '100%' }}
      value={value ?? undefined}
      placeholder={t('locations.selectPlaceholder')}
      allowClear={allowClear}
      onChange={handleChange}
      options={map(active, (l) => ({ value: l.id, label: l.name }))}
    />
  )
}
