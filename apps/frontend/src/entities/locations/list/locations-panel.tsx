import { useState } from 'react'

import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { useSafeAction } from 'common/lib/use-safe-action'
import { EmptyState, QueryState } from 'common/ui'

import { useDeleteLocation, useLocations } from '../api/use-locations'
import { LocationFormModal } from '../form/location-form-modal'
import { LocationCard } from './location-card'

import type { Location } from '../model/types'

import './location-card.scss'

/** Locations management block, embedded into the Finance page. */
export function LocationsPanel() {
  const { t } = useTranslation()
  const { data: locations = [], isPending, isError, refetch } = useLocations()
  const deleteLocation = useDeleteLocation()
  const run = useSafeAction()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  const handleAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const handleEdit = (location: Location) => {
    setEditing(location)
    setModalOpen(true)
  }
  const handleClose = () => setModalOpen(false)
  // Единственная мутация во фронте, что была fire-and-forget: модалка
  // закрывалась мгновенно, а отказ сервера не показывался вообще.
  const handleDelete = async (location: Location) => {
    const done = await run(() => deleteLocation.mutateAsync(location.id), {
      success: t('locations.deleted'),
    })
    if (done !== undefined) setModalOpen(false)
  }

  return (
    <div className="fin-section">
      <div className="fin-section__header">
        <h3 className="fin-section__title">{t('locations.title')}</h3>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
          {t('locations.addButton')}
        </Button>
      </div>

      <QueryState
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        skeletonRows={2}
        isEmpty={!locations.length}
        empty={
          <EmptyState
            title={t('locations.empty.title')}
            text={t('locations.empty.text')}
          />
        }
      >
        <div className="locations-grid">
          {map(locations, (loc) => (
            <LocationCard key={loc.id} location={loc} onEdit={handleEdit} />
          ))}
        </div>
      </QueryState>

      <LocationFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        location={editing}
        onClose={handleClose}
        onDelete={handleDelete}
      />
    </div>
  )
}
