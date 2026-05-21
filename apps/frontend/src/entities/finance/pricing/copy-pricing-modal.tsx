import { useState } from 'react'
import { Modal, Select } from 'antd'

import filter from 'lodash/filter'
import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useLocations } from 'entities/locations'

import { useCopyPricingRules } from '../api/use-finance'

interface CopyPricingModalProps {
  open: boolean
  toLocationId: string
  onClose: () => void
}

/** Copies all pricing rules from a chosen source location into the current one. */
export function CopyPricingModal({ open, toLocationId, onClose }: CopyPricingModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: locations = [] } = useLocations()
  const copyRules = useCopyPricingRules()

  const [fromId, setFromId] = useState('')

  const sources = filter(locations, (l) => l.id !== toLocationId)

  const handleConfirm = async () => {
    if (!fromId) return
    try {
      await copyRules.mutateAsync({ fromLocationId: fromId, toLocationId })
      toast({
        type: 'success',
        title: t('finance.pricing.copied'),
        msg: t('finance.pricing.copiedMsg'),
      })
      setFromId('')
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return (
    <Modal
      open={open}
      title={t('finance.pricing.copyButton')}
      okText={t('finance.pricing.copyConfirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ disabled: !fromId, loading: copyRules.isPending }}
      onOk={handleConfirm}
      onCancel={onClose}
      destroyOnHidden
    >
      <p>{t('finance.pricing.copyFromLabel')}</p>
      <Select
        style={{ width: '100%' }}
        value={fromId || undefined}
        placeholder={t('finance.pricing.copyFromPlaceholder')}
        onChange={setFromId}
        options={map(sources, (l) => ({ value: l.id, label: l.name }))}
      />
    </Modal>
  )
}
