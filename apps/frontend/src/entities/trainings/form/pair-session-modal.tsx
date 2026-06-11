import { Button, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd'
import { CheckOutlined, SyncOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'

import { usePairSession } from './use-pair-session'

import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface PairSessionModalProps {
  open: boolean
  indGroupId: string
  onClose: () => void
}

export function PairSessionModal({ open, indGroupId, onClose }: PairSessionModalProps) {
  const { t } = useTranslation()
  const form = usePairSession({ indGroupId, onDone: onClose })

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => form.setDate(e.target.value)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => form.setTime(e.target.value)
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => form.setNote(e.target.value)
  const handleToggleRecurring = () => form.setRecurring(!form.recurring)

  const options = form.sortedStudents.map((s) => ({ value: s.id, label: s.name }))

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('trainings.pair.create')}
    </Button>,
  ]

  return (
    <Modal open={open} title={t('trainings.pair.title')} onCancel={onClose} footer={footer} destroyOnHidden>
      <Form layout="vertical">
        <Form.Item label={t('trainings.individual.durationLabel')}>
          <Segmented
            block
            value={form.duration}
            onChange={(v) => form.setDuration(v as number)}
            options={[
              { label: t('trainings.individual.duration60'), value: 60 },
              { label: t('trainings.individual.duration90'), value: 90 },
            ]}
          />
        </Form.Item>

        <Form.Item label={t('trainings.pair.clientA')} required>
          <Select
            value={form.clientA || undefined}
            placeholder={t('trainings.individual.clientPlaceholder')}
            onChange={form.setClientA}
            options={options}
          />
        </Form.Item>
        <Form.Item label={t('trainings.pair.clientB')} required>
          <Select
            value={form.clientB || undefined}
            placeholder={t('trainings.individual.clientPlaceholder')}
            onChange={form.setClientB}
            options={options}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('trainings.individual.dateLabel')} required>
            <Input type="date" value={form.date} onChange={handleDateChange} />
          </Form.Item>
          <Form.Item label={t('trainings.individual.timeLabel')}>
            <Input type="time" value={form.time} onChange={handleTimeChange} />
          </Form.Item>
        </div>

        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>

        <Form.Item>
          <div
            className={`rec-toggle-card${form.recurring ? ' rec-toggle-card--checked' : ''}`}
            onClick={handleToggleRecurring}
          >
            <SyncOutlined className="rec-toggle-card__icon" />
            <div className="rec-toggle-card__text">
              <span className="rec-toggle-card__label">{t('trainings.individual.weekly')}</span>
              <span className="rec-toggle-card__hint">{t('trainings.pair.weeklyHint')}</span>
            </div>
            <div className="rec-toggle-card__check">{form.recurring && <CheckOutlined />}</div>
          </div>
        </Form.Item>

        {form.recurring && (
          <Form.Item label={t('trainings.individual.repeatLabel')}>
            <InputNumber
              min={1}
              max={52}
              value={form.repeatCount}
              onChange={(v) => form.setRepeatCount(typeof v === 'number' ? v : 1)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        <Form.Item label={t('trainings.individual.noteLabel')}>
          <Input.TextArea
            rows={2}
            value={form.note}
            onChange={handleNoteChange}
            placeholder={t('trainings.individual.notePlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
