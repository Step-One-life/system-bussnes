import { Button, Checkbox, Form, Input, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'

import { ConflictHint, PrimeHint } from './training-hints'
import { useGroupTraining } from './use-group-training'

import type { ChangeEvent } from 'react'

import './training-modals.scss'

interface GroupTrainingModalProps {
  open: boolean
  onClose: () => void
}

export function GroupTrainingModal({ open, onClose }: GroupTrainingModalProps) {
  const { t } = useTranslation()
  const form = useGroupTraining({ onDone: onClose })

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setDate(e.target.value)
  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setTime(e.target.value)
  const handleToggleAttendee = (studentId: string) => () =>
    form.toggleAttendee(studentId)
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    form.setNote(e.target.value)

  const footer = [
    <Button key="cancel" onClick={onClose}>
      {t('common.cancel')}
    </Button>,
    <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
      {t('trainings.group.saveAndDeduct')}
    </Button>,
  ]

  return (
    <Modal
      open={open}
      title={t('trainings.group.title')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label={t('trainings.group.groupLabel')}>
          <Select
            value={form.groupId || undefined}
            placeholder={t('trainings.group.groupPlaceholder')}
            onChange={form.setGroupId}
            options={form.regularGroups.map((g) => ({ value: g.name, label: g.name }))}
          />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <Form.Item label={t('trainings.group.dateLabel')}>
            <Input
              type="date"
              value={form.date}
              onChange={handleDateChange}
            />
          </Form.Item>
          <Form.Item label={t('trainings.group.timeLabel')}>
            <Input
              type="time"
              value={form.time}
              onChange={handleTimeChange}
            />
          </Form.Item>
        </div>
        <ConflictHint conflicts={form.conflicts} />
        <PrimeHint date={form.date} time={form.time} locationId={form.locationId} />
        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>
        <Form.Item label={t('trainings.group.studentsLabel')}>
          {!form.groupId ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {t('trainings.group.pickGroupFirst')}
            </p>
          ) : form.groupStudents.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {form.groupStudents.map((s) => (
                <Checkbox
                  key={s.id}
                  checked={form.attendees.includes(s.id)}
                  onChange={handleToggleAttendee(s.id)}
                >
                  {s.name}
                </Checkbox>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {t('trainings.group.noStudents')}
            </p>
          )}
        </Form.Item>
        <Form.Item label={t('trainings.group.noteLabel')}>
          <Input.TextArea
            rows={2}
            value={form.note}
            onChange={handleNoteChange}
            placeholder={t('trainings.group.notePlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
