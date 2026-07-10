import { Button, Checkbox, DatePicker, Form, Input, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { subLabel } from '../model/subscription-status'
import { useStudentForm } from './use-student-form'

import type { Student } from '../model/types'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import type { Dayjs } from 'dayjs'
import type { ChangeEvent } from 'react'

import dayjs from 'dayjs'

interface StudentFormModalProps {
  open: boolean
  student: Student | null
  onClose: () => void
}

export function StudentFormModal({ open, student, onClose }: StudentFormModalProps) {
  const { t } = useTranslation()
  const form = useStudentForm({ student, onDone: onClose })

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setName(e.target.value)
  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) =>
    form.setPhone(e.target.value)
  const handleNoteChange = (e: ChangeEvent<HTMLTextAreaElement>) =>
    form.setNote(e.target.value)
  const handleToggleGroup =
    (groupName: string) => (e: CheckboxChangeEvent) =>
      form.toggleGroup(groupName, e.target.checked)
  const handleToggleIndGroup = (e: CheckboxChangeEvent) =>
    form.indGroup && form.toggleGroup(form.indGroup.name, e.target.checked)
  const handleSubStartChange = (d: Dayjs | null) =>
    form.setSubStartDate(d ? d.format('YYYY-MM-DD') : form.subStartDate)
  const handleSubChoiceChange = (groupName: string) => (v: string) =>
    form.setSubChoice({ ...form.subChoice, [groupName]: v })

  return (
    <Modal
      open={open}
      title={form.isEdit ? t('students.form.editTitle') : t('students.form.createTitle')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={form.saving} onClick={form.submit}>
          {form.isEdit ? t('common.save') : t('common.add')}
        </Button>,
      ]}
    >
      <Form layout="vertical">
        <Form.Item label={t('students.form.nameLabel')} required>
          <Input
            value={form.name}
            onChange={handleNameChange}
            placeholder={t('students.form.namePlaceholder')}
          />
        </Form.Item>

        <Form.Item label={t('students.form.phoneLabel')}>
          <Input
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder={t('students.form.phonePlaceholder')}
            inputMode="tel"
            allowClear
          />
        </Form.Item>

        <Form.Item label={t('students.form.groupsLabel')}>
          {form.regularGroups.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.regularGroups.map((g) => (
                <Checkbox
                  key={g.id}
                  checked={form.selectedGroups.includes(g.name)}
                  onChange={handleToggleGroup(g.name)}
                >
                  {g.name}
                </Checkbox>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--tk-text-tertiary)', fontSize: '0.85rem' }}>
              {t('students.form.noGroups')}
            </span>
          )}
        </Form.Item>

        {form.indGroup && (
          <Form.Item label={t('students.form.indLabel')}>
            <Checkbox
              checked={form.selectedGroups.includes(form.indGroup.name)}
              onChange={handleToggleIndGroup}
            >
              {t('students.form.indCheckbox')}
            </Checkbox>
          </Form.Item>
        )}

        {!form.isEdit && form.selectedGroups.length > 0 && (
          <>
            <Form.Item label={t('students.form.subStartLabel')}>
              <DatePicker
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
                value={dayjs(form.subStartDate)}
                onChange={handleSubStartChange}
              />
            </Form.Item>
            {form.selectedGroups.map((g) => {
              const options = [
                { value: '', label: t('students.form.subNone') },
                ...form.optionsForGroup(g).map((r) => ({
                  value: r.id,
                  label: subLabel({
                    total: r.sessions_count,
                    sessionDuration: r.duration_minutes,
                    isUnlimited: r.format === 'unlimited',
                  }),
                })),
              ]
              return (
                <Form.Item
                  key={g}
                  label={t('students.form.subForGroup', { group: g })}
                  extra={options.length <= 1 ? t('subscriptions.add.noTariffHint') : undefined}
                >
                  <Select
                    value={form.subChoice[g] ?? ''}
                    onChange={handleSubChoiceChange(g)}
                    options={options}
                  />
                </Form.Item>
              )
            })}
          </>
        )}

        <Form.Item label={t('students.form.noteLabel')} style={{ marginBottom: 0 }}>
          <Input.TextArea
            value={form.note}
            onChange={handleNoteChange}
            placeholder={t('students.form.notePlaceholder')}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={2000}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
