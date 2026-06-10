import { useMemo } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { LocationSelect } from 'entities/locations'
import { useStudents } from 'entities/students'
import { useTrainings } from 'entities/trainings/api/use-trainings'

import { DURATIONS } from './schedule-config'
import { ScheduleEditor } from './schedule-editor'
import { useGroupForm } from './use-group-form'

import type { Group } from '../model/types'

interface GroupFormModalProps {
  open: boolean
  group: Group | null
  onClose: () => void
  onDelete?: (group: Group) => void
}

export function GroupFormModal({ open, group, onClose, onDelete }: GroupFormModalProps) {
  const { t } = useTranslation()
  const form = useGroupForm({ group, onDone: onClose })
  const { data: trainings = [] } = useTrainings()
  const { data: students = [] } = useStudents()

  // Честные последствия удаления: каскад снесёт занятия, «свои» абонементы и
  // историю посещений; общие абонементы бэк сохраняет для остальных групп.
  const impact = useMemo(() => {
    if (!group) return { trainings: 0, subs: 0, active: 0 }
    let subs = 0
    let active = 0
    for (const s of students) {
      for (const sub of s.subscriptions) {
        const isShared = (sub.groupIds?.length ?? 0) > 1
        if (!isShared && sub.groupId === group.name) {
          subs += 1
          if (sub.isActive) active += 1
        }
      }
    }
    return {
      trainings: trainings.filter((tr) => tr.groupId === group.name).length,
      subs,
      active,
    }
  }, [group, trainings, students])

  const handleDeleteConfirm = () => {
    if (group && onDelete) onDelete(group)
  }
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    form.setName(e.target.value)

  const footer = [
    group && onDelete && (
      <Popconfirm
        key="delete"
        title={t('groups.form.deleteTitle', { name: group.name })}
        description={
          <div style={{ maxWidth: 320 }}>
            <p style={{ margin: 0 }}>
              {t('groups.form.deleteImpact', {
                trainings: impact.trainings,
                subs: impact.subs,
              })}
            </p>
            {impact.active > 0 && (
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                {t('groups.form.deleteImpactActive', { count: impact.active })}
              </p>
            )}
            <p style={{ margin: '4px 0 0' }}>{t('groups.form.deleteImpactShared')}</p>
          </div>
        }
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
      title={form.isEdit ? t('groups.form.editTitle') : t('groups.form.createTitle')}
      onCancel={onClose}
      footer={footer}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label={t('groups.form.nameLabel')} required={!form.isEdit}>
          {form.isEdit ? (
            <Input value={form.name} disabled />
          ) : (
            <Input
              value={form.name}
              onChange={handleNameChange}
              placeholder={t('groups.form.namePlaceholder')}
            />
          )}
        </Form.Item>
        <Form.Item label={t('groups.form.scheduleLabel')}>
          <ScheduleEditor value={form.schedule} onChange={form.setSchedule} />
        </Form.Item>
        <Form.Item label={t('groups.form.durationLabel')}>
          <Select
            value={form.duration}
            onChange={form.setDuration}
            options={DURATIONS.map((m) => ({
              value: m,
              label: t('groups.form.durationOption', { minutes: m }),
            }))}
          />
        </Form.Item>
        <Form.Item label={t('locations.selectLabel')}>
          <LocationSelect value={form.locationId} onChange={form.setLocationId} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
