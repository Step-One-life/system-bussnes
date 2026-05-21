import { Button, Checkbox, Form, Input, Modal, Popconfirm, Select } from 'antd'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { LOCATION_KINDS } from '../model/location-kinds'
import { useLocationForm } from './use-location-form'

import type { Location, LocationKind } from '../model/types'
import type { ChangeEvent } from 'react'

interface LocationFormModalProps {
  open: boolean
  location: Location | null
  onClose: () => void
  onDelete?: (location: Location) => void
}

export function LocationFormModal({
  open,
  location,
  onClose,
  onDelete,
}: LocationFormModalProps) {
  const { t } = useTranslation()
  const form = useLocationForm({ location, onDone: onClose })

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setName(e.target.value)
  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setAddress(e.target.value)
  const handleKindChange = (value: LocationKind) => form.setKind(value)
  const handleDefaultChange = (e: { target: { checked: boolean } }) =>
    form.setIsDefault(e.target.checked)
  const handleDeleteConfirm = () => {
    if (location && onDelete) onDelete(location)
  }

  const footer = [
    location && onDelete && (
      <Popconfirm
        key="delete"
        title={t('locations.form.deleteTitle')}
        description={t('locations.form.deleteDescription')}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        onConfirm={handleDeleteConfirm}
      >
        <Button danger style={{ marginRight: 'auto' }}>
          {t('common.delete')}
        </Button>
      </Popconfirm>
    ),
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {form.isEdit ? t('common.save') : t('common.create')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={form.isEdit ? t('locations.form.editTitle') : t('locations.form.createTitle')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label={t('locations.form.nameLabel')}>
          <Input
            value={form.name}
            onChange={handleNameChange}
            placeholder={t('locations.form.namePlaceholder')}
          />
        </Form.Item>
        <Form.Item label={t('locations.form.addressLabel')}>
          <Input
            value={form.address ?? ''}
            onChange={handleAddressChange}
            placeholder={t('locations.form.addressPlaceholder')}
          />
        </Form.Item>
        <Form.Item label={t('locations.form.kindLabel')}>
          <Select
            value={form.kind}
            onChange={handleKindChange}
            options={map(LOCATION_KINDS, (k) => ({
              value: k.value,
              label: t(k.labelKey),
            }))}
          />
        </Form.Item>
        <Form.Item>
          <Checkbox checked={form.isDefault} onChange={handleDefaultChange}>
            {t('locations.form.defaultLabel')}
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  )
}
