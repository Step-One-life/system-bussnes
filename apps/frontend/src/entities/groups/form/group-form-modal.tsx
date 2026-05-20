import { Button, Form, Input, Modal, Popconfirm, Select } from 'antd'

import { useTranslation } from 'react-i18next'

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

  const handleDeleteConfirm = () => {
    if (group && onDelete) onDelete(group)
  }
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    form.setName(e.target.value)

  const footer = [
    group && onDelete && (
      <Popconfirm
        key="delete"
        title={t('groups.form.deleteTitle')}
        description={t('groups.form.deleteDescription')}
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
        <Form.Item label={t('groups.form.nameLabel')}>
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
      </Form>
    </Modal>
  )
}
