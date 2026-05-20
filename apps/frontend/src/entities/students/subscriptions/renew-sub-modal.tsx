import { useState } from 'react'

import { Button, DatePicker, Form, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useAddSubscription } from '../api/use-students'

import type { SubscriptionType } from '../model/types'
import type { Dayjs } from 'dayjs'

import dayjs from 'dayjs'

interface RenewSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  groupId: string
  onClose: () => void
}

export function RenewSubModal({
  open,
  studentId,
  studentName,
  groupId,
  onClose,
}: RenewSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const addSubscription = useAddSubscription()
  const [type, setType] = useState<SubscriptionType>('8')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const submit = async () => {
    await addSubscription.mutateAsync({
      studentId,
      data: { groupId, type, createdAt: date },
    })
    toast({
      type: 'success',
      title: t('subscriptions.renew.subRenewed'),
      msg: `${studentName} · ${groupId}`,
    })
    onClose()
  }

  const handleTypeChange = (v: string) => setType(v as SubscriptionType)
  const handleDateChange = (d: Dayjs | null) =>
    setDate(d ? d.format('YYYY-MM-DD') : date)

  return (
    <Modal
      open={open}
      title={t('subscriptions.renew.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={addSubscription.isPending} onClick={submit}>
          {t('common.extend')}
        </Button>,
      ]}
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {t('subscriptions.renew.student')} <strong>{studentName}</strong>
        <br />
        {t('subscriptions.renew.group')} <strong>{groupId}</strong>
      </p>
      <Form layout="vertical">
        <Form.Item label={t('subscriptions.renew.typeLabel')}>
          <Select
            value={type}
            onChange={handleTypeChange}
            options={[
              { value: '1', label: t('students.sub.single') },
              { value: '4', label: t('students.sub.sub4') },
              { value: '8', label: t('students.sub.sub8') },
            ]}
          />
        </Form.Item>
        <Form.Item label={t('subscriptions.renew.dateLabel')}>
          <DatePicker
            style={{ width: '100%' }}
            value={dayjs(date)}
            onChange={handleDateChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
