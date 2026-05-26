import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select } from 'antd'

import map from 'lodash/map'

import { useTranslation } from 'react-i18next'

import { useUnsavedFormGuard } from 'common/lib/use-unsaved-form-guard'
import { useLocations } from 'entities/locations'

import { PresetPicker } from './preset-picker'
import { DURATION_PRESETS, LESSON_KINDS, PRICING_FORMATS, SESSIONS_PRESETS } from './pricing-config'
import { useRuleForm } from './use-rule-form'

import type { LessonKind, PricingFormat, PricingRule } from '../model/types'
import type { ChangeEvent } from 'react'

interface RuleFormModalProps {
  open: boolean
  locationId: string
  rule: PricingRule | null
  onClose: () => void
  onDelete?: (rule: PricingRule) => void
}

export function RuleFormModal({
  open,
  locationId,
  rule,
  onClose,
  onDelete,
}: RuleFormModalProps) {
  const { t } = useTranslation()
  const form = useRuleForm({ locationId, rule, onDone: onClose })
  const { data: locations = [] } = useLocations()

  // Спрашиваем подтверждение перед закрытием формы и перед уходом со страницы,
  // если пользователь начал вводить данные, но не нажал «Сохранить».
  const { confirmClose } = useUnsavedFormGuard({
    isDirty: open && form.isDirty,
    confirmTitle: t('finance.pricing.ruleForm.unsavedTitle'),
    confirmContent: t('finance.pricing.ruleForm.unsavedContent'),
    okText: t('finance.pricing.ruleForm.unsavedLeave'),
    cancelText: t('finance.pricing.ruleForm.unsavedStay'),
  })

  const handleCancel = () => confirmClose(onClose)
  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setTitle(e.target.value)
  const handleNumberChange = (setter: (v: number) => void) => (v: number | null) =>
    setter(typeof v === 'number' ? v : 0)
  const handleDeleteConfirm = () => {
    if (rule && onDelete) onDelete(rule)
  }
  const formatMinutes = (n: number) => t('finance.pricing.durationPreset', { minutes: n })
  const formatCount = (n: number) => String(n)

  const footer = [
    rule && onDelete && (
      <Popconfirm
        key="delete"
        title={t('finance.pricing.ruleForm.deleteTitle')}
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
    <Button key="cancel" onClick={handleCancel}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {form.isEdit ? t('common.save') : t('common.create')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={
        form.isEdit
          ? t('finance.pricing.ruleForm.editTitle')
          : t('finance.pricing.ruleForm.createTitle')
      }
      onCancel={handleCancel}
      footer={footer}
      destroyOnHidden
      width={520}
    >
      <Form layout="vertical">
        <Form.Item label={t('finance.pricing.ruleForm.titleLabel')}>
          <Input
            value={form.title}
            onChange={handleTitleChange}
            placeholder={t('finance.pricing.ruleForm.titlePlaceholder')}
          />
        </Form.Item>
        <Form.Item
          label={t('finance.pricing.ruleForm.locationLabel')}
          extra={
            form.isEdit ? t('finance.pricing.ruleForm.locationLockedHint') : undefined
          }
        >
          <Select
            value={form.ruleLocationId || undefined}
            onChange={form.setRuleLocationId}
            disabled={form.isEdit}
            placeholder={t('finance.pricing.ruleForm.locationPlaceholder')}
            options={map(locations, (l) => ({ value: l.id, label: l.name }))}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('finance.pricing.ruleForm.lessonKindLabel')}>
            <Select<LessonKind>
              value={form.lessonKind}
              onChange={form.setLessonKind}
              options={map(LESSON_KINDS, (k) => ({
                value: k,
                label: t(`finance.pricing.lessonKind.${k}`),
              }))}
            />
          </Form.Item>
          <Form.Item label={t('finance.pricing.ruleForm.formatLabel')}>
            <Select<PricingFormat>
              value={form.format}
              onChange={form.setFormat}
              options={map(PRICING_FORMATS, (f) => ({
                value: f,
                label: t(`finance.pricing.format.${f}`),
              }))}
            />
          </Form.Item>
        </div>
        <Form.Item label={t('finance.pricing.ruleForm.durationLabel')}>
          <PresetPicker
            presets={DURATION_PRESETS}
            value={form.duration}
            isPreset={form.durationIsPreset}
            customLabel={t('finance.pricing.ruleForm.durationCustom')}
            formatPreset={formatMinutes}
            onChange={form.setDuration}
          />
        </Form.Item>
        <Form.Item label={t('finance.pricing.ruleForm.sessionsLabel')}>
          <PresetPicker
            presets={SESSIONS_PRESETS}
            value={form.sessions}
            isPreset={form.sessionsIsPreset}
            customLabel={t('finance.pricing.ruleForm.sessionsCustom')}
            formatPreset={formatCount}
            onChange={form.setSessions}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('finance.pricing.ruleForm.clientPriceLabel')}>
            <InputNumber
              min={0}
              value={form.clientPrice}
              onChange={handleNumberChange(form.setClientPrice)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={t('finance.pricing.ruleForm.clientPrimePriceLabel')}>
            <InputNumber
              min={0}
              value={form.clientPrimePrice}
              onChange={handleNumberChange(form.setClientPrimePrice)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={t('finance.pricing.ruleForm.hallCostLabel')}>
            <InputNumber
              min={0}
              value={form.hallCost}
              onChange={handleNumberChange(form.setHallCost)}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={t('finance.pricing.ruleForm.hallPrimeCostLabel')}>
            <InputNumber
              min={0}
              value={form.hallPrimeCost}
              onChange={handleNumberChange(form.setHallPrimeCost)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}
