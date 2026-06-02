import { Button, Popconfirm } from 'antd'
import { DeleteOutlined, DollarOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge, SubProgressBar } from 'common/ui'

import { getSubStatus } from '../model/subscription-status'

import type { Student, Subscription } from '../model/types'

interface SharedSubCardProps {
  student: Student
  sub: Subscription
  onDeleteSub: (subId: string) => void
  onMarkPaid: (subId: string) => void
}

/** Плашка общего абонемента: один баланс на несколько групп. */
export function SharedSubCard({ student, sub, onDeleteSub, onMarkPaid }: SharedSubCardProps) {
  const { t } = useTranslation()
  const status = getSubStatus(student, sub.groupId)

  const handleDelete = () => onDeleteSub(sub.id)
  const handleMarkPaid = () => onMarkPaid(sub.id)

  return (
    <div className="sub-card">
      <div className="sub-card__head">
        <span className="sub-card__title">{sub.groupIds.join(' + ')}</span>
        <span style={{ marginLeft: 'auto' }}>
          <StatusBadge status={status} />
        </span>
        <Popconfirm
          title={t('students.subCard.deleteSubTitle')}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={handleDelete}
        >
          <Button type="text" size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>

      <SubProgressBar sub={sub.isActive ? sub : null} />

      {!sub.finPaymentId && (
        <div className="sub-card__actions">
          <Button size="small" icon={<DollarOutlined />} onClick={handleMarkPaid}>
            {t('students.subCard.markPaid')}
          </Button>
        </div>
      )}
    </div>
  )
}
