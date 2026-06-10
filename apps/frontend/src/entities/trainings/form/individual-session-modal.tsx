import { Button, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd'
import { CheckOutlined, SyncOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { SubProgressBar } from 'common/ui'
import { LocationSelect } from 'entities/locations'

import { ConflictHint, PrimeHint } from './training-hints'
import { useIndividualSession } from './use-individual-session'

import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface IndividualSessionModalProps {
  open: boolean
  indGroupId: string
  onClose: () => void
  isOnline?: boolean
}

export function IndividualSessionModal({
  open,
  indGroupId,
  onClose,
  isOnline = false,
}: IndividualSessionModalProps) {
  const { t } = useTranslation()
  const form = useIndividualSession({ indGroupId, onDone: onClose, isOnline })

  const handleSelectDuration = (d: number) => () => form.setDuration(d)
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setDate(e.target.value)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setTime(e.target.value)
  const handleToggleRecurring = () => form.setRecurring(!form.recurring)
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    form.setNote(e.target.value)

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('trainings.individual.recordAndDeduct')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={isOnline ? t('trainings.online.title') : t('trainings.individual.title')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label={t('trainings.individual.durationLabel')}>
          <div className="dur-toggle">
            {[60, 90].map((d) => (
              <button
                key={d}
                className={`dur-toggle__btn${form.duration === d ? ' dur-toggle__btn--active' : ''}`}
                onClick={handleSelectDuration(d)}
              >
                {d === 90
                  ? t('trainings.individual.duration90')
                  : t('trainings.individual.duration60')}
              </button>
            ))}
          </div>
        </Form.Item>

        <Form.Item label={t('trainings.individual.clientLabel')} required>
          <Select
            value={form.clientId || undefined}
            placeholder={t('trainings.individual.clientPlaceholder')}
            onChange={form.setClientId}
            options={form.sortedStudents.map((s) => {
              const hasSub = s.subscriptions.some(
                (sub) => sub.groupId === indGroupId && sub.isActive,
              )
              return {
                value: s.id,
                label: hasSub ? s.name : t('trainings.individual.noSubOption', { name: s.name }),
              }
            })}
          />
          {form.client && form.activeSub && (
            <div
              style={{
                marginTop: 'var(--sp-2)',
                padding: 'var(--sp-3)',
                background: 'var(--surface-2)',
                borderRadius: 'var(--r-md)',
              }}
            >
              <SubProgressBar sub={form.activeSub} />
            </div>
          )}
          {form.client && !form.activeSub && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'var(--sp-2)' }}>
              {form.duration === 90
                ? t('trainings.individual.noActiveSub90')
                : t('trainings.individual.noActiveSub60')}
            </p>
          )}
        </Form.Item>

        <Form.Item label={t('trainings.individual.paymentLabel')}>
          <Segmented
            block
            value={form.paymentMode}
            onChange={(v) => form.setPaymentMode(v as 'subscription' | 'oneoff')}
            options={[
              { label: t('trainings.individual.paymentSubscription'), value: 'subscription' },
              { label: t('trainings.individual.paymentOneoff'), value: 'oneoff' },
            ]}
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

        <ConflictHint conflicts={form.conflicts} />
        <PrimeHint date={form.date} time={form.time} locationId={form.locationId} />

        {!isOnline && (
          <Form.Item label={t('locations.selectLabel')}>
            <LocationSelect value={form.locationId} onChange={form.setLocationId} />
          </Form.Item>
        )}

        {form.client && !form.activeSub && form.paymentMode === 'subscription' && (
          <>
            <Form.Item label={t('trainings.individual.newSubLabel')}>
              <Select
                value={form.subType}
                onChange={form.setSubType}
                options={form.subOptions}
              />
            </Form.Item>
            <Form.Item
              label={t('trainings.individual.slotLabel')}
              extra={t('trainings.individual.slotHint')}
            >
              <Segmented
                block
                value={form.slot}
                onChange={(v) => form.setSlot(v as 'regular' | 'prime')}
                options={[
                  { label: t('finance.markPaid.regular'), value: 'regular' },
                  { label: t('finance.markPaid.prime'), value: 'prime' },
                ]}
              />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <div
            className={`rec-toggle-card${form.recurring ? ' rec-toggle-card--checked' : ''}`}
            onClick={handleToggleRecurring}
          >
            <SyncOutlined className="rec-toggle-card__icon" />
            <div className="rec-toggle-card__text">
              <span className="rec-toggle-card__label">
                {t('trainings.individual.weekly')}
              </span>
              <span className="rec-toggle-card__hint">
                {t('trainings.individual.weeklyHint')}
              </span>
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
