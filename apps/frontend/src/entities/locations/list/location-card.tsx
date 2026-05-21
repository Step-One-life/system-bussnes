import { Button, Tag } from 'antd'
import { EditOutlined } from '@ant-design/icons'

import find from 'lodash/find'

import { useTranslation } from 'react-i18next'

import { LOCATION_KINDS } from '../model/location-kinds'

import type { Location } from '../model/types'
import type { MouseEvent } from 'react'

import './location-card.scss'

interface LocationCardProps {
  location: Location
  onEdit: (location: Location) => void
}

export function LocationCard({ location, onEdit }: LocationCardProps) {
  const { t } = useTranslation()
  const kind = find(LOCATION_KINDS, (k) => k.value === location.kind)

  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation()
    onEdit(location)
  }

  return (
    <div className="location-card">
      <div className="location-card__head">
        <div className="location-card__name">{location.name}</div>
        <Button type="text" size="small" icon={<EditOutlined />} onClick={handleEdit} />
      </div>
      <div className="location-card__address">
        {location.address || t('locations.card.noAddress')}
      </div>
      <div className="location-card__tags">
        <Tag>{kind ? t(kind.labelKey) : location.kind}</Tag>
        {location.isDefault && <Tag color="blue">{t('locations.card.default')}</Tag>}
        {location.archived && <Tag>{t('locations.card.archived')}</Tag>}
      </div>
    </div>
  )
}
