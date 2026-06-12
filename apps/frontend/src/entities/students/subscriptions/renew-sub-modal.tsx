import { useState } from 'react'

import { Button, DatePicker, Form, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { resolvePricingRule, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { useAddSubscription, useStudents } from '../api/use-students'

import type { SubscriptionType } from '../model/types'
import type { Dayjs } from 'dayjs'

import dayjs from 'dayjs'

interface RenewSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  groupId: string
  onClose: () => void
  /** «Оформить абонемент» вместо «Продлить» — для ученика без абонемента. */
  issueMode?: boolean
  /** Вызывается только при успешном создании (onClose зовётся и при отмене). */
  onCreated?: () => void
}

export function RenewSubModal({
  open,
  studentId,
  studentName,
  groupId,
  onClose,
  issueMode = false,
  onCreated,
}: RenewSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const addSubscription = useAddSubscription()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const [type, setType] = useState<SubscriptionType>('8')
  const [date, setDate] = useState(todayISO())

  const submit = async () => {
    const group = groups.find((g) => g.id === groupId) ?? null
    const { rule } = await resolvePricingRule(
      group?.locationId ?? null,
      subTypeToTuple(type, group?.isIndividual ?? false),
    )
    // Продление наследует слот (прайм/обычный) от предыдущего абонемента группы,
    // чтобы прайм-клиент при продлении не сбрасывался на «обычный».
    const groupName = group?.name ?? groupId
    const prevSub =
      [...(students.find((s) => s.id === studentId)?.subscriptions ?? [])]
        .filter((s) => s.groupId === groupName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    await addSubscription.mutateAsync({
      studentId,
      data: {
        groupId,
        type,
        createdAt: date,
        validityDays: rule?.validity_days,
        timeSlot: prevSub?.timeSlot ?? 'regular',
      },
    })
    toast({
      type: 'success',
      title: issueMode ? t('subscriptions.issue.created') : t('subscriptions.renew.subRenewed'),
      msg: `${studentName} · ${groupId}`,
    })
    onCreated?.()
    onClose()
  }

  const handleTypeChange = (v: string) => setType(v as SubscriptionType)
  const handleDateChange = (d: Dayjs | null) =>
    setDate(d ? d.format('YYYY-MM-DD') : date)

  return (
    <Modal
      open={open}
      title={issueMode ? t('subscriptions.issue.title') : t('subscriptions.renew.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={addSubscription.isPending} onClick={submit}>
          {issueMode ? t('subscriptions.issue.createBtn') : t('common.extend')}
        </Button>,
      ]}
    >
      <p style={{ color: 'var(--tk-text-secondary)', fontSize: '0.85rem' }}>
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
            format="DD.MM.YYYY"
            style={{ width: '100%' }}
            value={dayjs(date)}
            onChange={handleDateChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
