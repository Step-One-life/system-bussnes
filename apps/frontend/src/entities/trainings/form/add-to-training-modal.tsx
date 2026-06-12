import { useState } from 'react'

import { Button, Checkbox, Form, Input, Modal, Segmented, Select } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'

import { useAddToTraining } from './use-add-to-training'

import type { Training } from '../model/types'
import type { SubscriptionType } from 'entities/students/model/types'
import type { ChangeEvent } from 'react'

const STATUS_VARIANT = {
  active: 'active',
  ending: 'warn',
  danger: 'danger',
  expired: 'danger',
  none: 'neutral',
} as const

/** Поиск появляется только на длинных списках — на коротких он шум. */
const SEARCH_MIN = 8

interface AddToTrainingModalProps {
  open: boolean
  training: Training | null
  onClose: () => void
}

export function AddToTrainingModal({ open, training, onClose }: AddToTrainingModalProps) {
  if (!training) return null
  return <AddToTrainingModalInner training={training} open={open} onClose={onClose} />
}

function AddToTrainingModalInner({
  training,
  open,
  onClose,
}: {
  training: Training
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const form = useAddToTraining({ training, onDone: onClose })

  // Сбрасывать query не нужно: модалка с destroyOnHidden размонтируется.
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visibleCandidates = form.candidates.filter(
    (c) => !q || c.name.toLowerCase().includes(q),
  )
  const showSearch = form.candidates.length > SEARCH_MIN

  const newSubOptions = [
    { value: '', label: t('trainings.addTo.subNone') },
    { value: '1', label: t('students.sub.single') },
    { value: '4', label: t('students.sub.sub4') },
    { value: '8', label: t('students.sub.sub8') },
  ]

  const handleTabChange = (v: string | number) =>
    form.setTab(v as 'group' | 'new')
  const handleToggleCandidate = (candidateId: string) => () =>
    form.toggle(candidateId)
  const handleNewNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setNewName(e.target.value)
  const handleNewSubTypeChange = (v: string) =>
    form.setNewSubType(v as SubscriptionType | '')
  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('common.add')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={t('trainings.addTo.saving', { group: training.groupId })}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Segmented
        block
        value={form.tab}
        onChange={handleTabChange}
        options={[
          { value: 'group', label: t('trainings.addTo.fromGroup') },
          { value: 'new', label: t('trainings.addTo.newStudent') },
        ]}
        style={{ marginBottom: 'var(--sp-5)' }}
      />

      {form.tab === 'group' ? (
        <Form layout="vertical">
          <Form.Item label={t('trainings.addTo.groupStudents', { group: training.groupId })}>
            {showSearch && (
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={t('students.filter.searchPlaceholder')}
                value={query}
                onChange={handleQueryChange}
                style={{ marginBottom: 'var(--sp-3)' }}
              />
            )}
            {visibleCandidates.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {visibleCandidates.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--sp-3)',
                    }}
                  >
                    <Checkbox
                      checked={form.selected.includes(c.id)}
                      onChange={handleToggleCandidate(c.id)}
                    >
                      {c.name}
                    </Checkbox>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--sp-2)',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.78rem' }}>
                        {c.metaLabel}
                      </span>
                      <Badge variant={STATUS_VARIANT[c.status.type]}>{c.status.label}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.8rem' }}>
                {q ? t('students.notFound') : t('trainings.addTo.allAdded')}
              </p>
            )}
          </Form.Item>
        </Form>
      ) : (
        <Form layout="vertical">
          <Form.Item label={t('trainings.addTo.nameLabel')}>
            <Input
              value={form.newName}
              onChange={handleNewNameChange}
              placeholder={t('trainings.addTo.namePlaceholder')}
            />
          </Form.Item>
          <Form.Item label={t('trainings.addTo.subLabel')}>
            <Select
              value={form.newSubType}
              onChange={handleNewSubTypeChange}
              options={newSubOptions}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}
