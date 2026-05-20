import { useState } from 'react'

import { Button, Form, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDateFull } from 'common/utils/date'

import { useExtendSubscription } from '../api/use-students'

import type { Subscription } from '../model/types'

interface ExtendSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  groupId: string
  sub: Subscription | null
  onClose: () => void
}

const DAY_OPTIONS = [7, 14, 21, 30, 35, 45, 60, 90]

export function ExtendSubModal({
  open,
  studentId,
  studentName,
  groupId,
  sub,
  onClose,
}: ExtendSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const extendSub = useExtendSubscription()
  const [days, setDays] = useState(35)

  const submit = async () => {
    await extendSub.mutateAsync({ studentId, groupId, days })
    toast({
      type: 'success',
      title: t('subscriptions.extend.termExtended'),
      msg: t('subscriptions.extend.termExtendedMsg', { name: studentName, days }),
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      title={t('subscriptions.extend.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={extendSub.isPending} onClick={submit}>
          {t('common.extend')}
        </Button>,
      ]}
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {t('subscriptions.extend.student')} <strong>{studentName}</strong>
        <br />
        {t('subscriptions.extend.group')} <strong>{groupId}</strong>
      </p>
      {sub?.expiresAt && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
          {t('subscriptions.extend.currentTerm')} <strong>{formatDateFull(sub.expiresAt)}</strong>
        </div>
      )}
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label={t('subscriptions.extend.extendBy')}>
          <Select
            value={days}
            onChange={setDays}
            options={DAY_OPTIONS.map((d) => ({
              value: d,
              label: t('subscriptions.extend.daysOption', { days: d }),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
