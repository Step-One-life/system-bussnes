import { Button, Form, Input, Modal, Switch } from 'antd'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'

import { ConflictHint, PrimeHint } from './training-hints'
import { useEditTraining } from './use-edit-training'

import type { Training } from '../model/types'
import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface EditTrainingModalProps {
  open: boolean
  training: Training | null
  onClose: () => void
}

export function EditTrainingModal({ open, training, onClose }: EditTrainingModalProps) {
  const { t } = useTranslation()
  const form = useEditTraining({ training, onDone: onClose })

  if (!training) return null

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('common.save')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={t('trainings.edit.title')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('trainings.edit.dateLabel')}>
            <Input
              type="date"
              value={form.date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => form.setDate(e.target.value)}
            />
          </Form.Item>
          <Form.Item label={t('trainings.edit.timeLabel')}>
            <Input
              type="time"
              value={form.time}
              onChange={(e: ChangeEvent<HTMLInputElement>) => form.setTime(e.target.value)}
            />
          </Form.Item>
        </div>
        <ConflictHint conflicts={form.conflicts} />
        <PrimeHint date={form.date} time={form.time} locationId={form.locationId} />
        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>
        <Form.Item label={t('trainings.edit.noteLabel')}>
          <Input.TextArea
            rows={2}
            value={form.note}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => form.setNote(e.target.value)}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
          <Form.Item label={t('trainings.edit.onlineLabel')}>
            <Switch checked={form.isOnline} onChange={form.setIsOnline} />
          </Form.Item>
          <Form.Item label={t('trainings.edit.primeLabel')}>
            <Switch checked={form.isPrime} onChange={form.setIsPrime} />
          </Form.Item>
        </div>
        {form.isRecurring && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {t('trainings.edit.recurringNote')}
          </p>
        )}
      </Form>

      <Modal
        open={form.scopeOpen}
        title={t('trainings.edit.scopeTitle')}
        onCancel={() => form.setScopeOpen(false)}
        footer={[
          <Button key="single" onClick={() => form.confirmScope('single')}>
            {t('trainings.edit.scopeSingle')}
          </Button>,
          <Button key="series" type="primary" onClick={() => form.confirmScope('series')}>
            {t('trainings.edit.scopeSeries')}
          </Button>,
        ]}
      >
        {t('trainings.edit.scopeBody')}
      </Modal>
    </Modal>
  )
}
