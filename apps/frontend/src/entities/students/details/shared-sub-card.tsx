import { useState } from 'react'

import { Button, Dropdown, Modal } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge, StatusBadge, SubProgressBar } from 'common/ui'

import { getSubStatus, subLabel } from '../model/subscription-status'

import type { Student, Subscription } from '../model/types'
import type { MenuProps } from 'antd'

interface SharedSubCardProps {
  student: Student
  sub: Subscription
  onEdit: (sub: Subscription) => void
  /** Продление адресное: карточка передаёт СВОЙ абонемент. */
  onExtend: (sub: Subscription) => void
  onDeleteSub: (subId: string) => void
  onMarkPaid: (subId: string) => void
}

/** Плашка общего абонемента: один баланс на несколько групп. */
export function SharedSubCard({
  student,
  sub,
  onEdit,
  onExtend,
  onDeleteSub,
  onMarkPaid,
}: SharedSubCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const status = getSubStatus(student, sub.groupId)

  const handleMarkPaid = () => onMarkPaid(sub.id)

  // Управление общим абонементом теперь через меню «…» (паритет с обычной
  // карточкой): редактирование, продление срока, удаление.
  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('students.subCard.editSub'),
      onClick: () => onEdit(sub),
    },
    {
      key: 'extend',
      icon: <ClockCircleOutlined />,
      label: t('students.subCard.extendTerm'),
      onClick: () => onExtend(sub),
    },
    { type: 'divider' },
    {
      key: 'deleteSub',
      danger: true,
      icon: <DeleteOutlined />,
      label: t('students.subCard.deleteSub'),
      onClick: () => setConfirmDelete(true),
    },
  ]

  return (
    <div className="sub-card">
      <div className="sub-card__head">
        <span className="sub-card__title">{sub.groupIds.join(' + ')}</span>
        {/* Абонемент куплен по прайм-тарифу — видно без открытия оплаты. */}
        {sub.timeSlot === 'prime' && (
          <Badge variant="warn">{t('finance.markPaid.prime')}</Badge>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <StatusBadge status={status} />
        </span>
        <Dropdown trigger={['click']} menu={{ items: menuItems }}>
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            aria-label={t('common.more')}
          />
        </Dropdown>
      </div>

      <SubProgressBar sub={sub.isActive ? sub : null} />

      {!sub.finPaymentId && (
        <div className="sub-card__actions">
          <Button size="small" icon={<DollarOutlined />} onClick={handleMarkPaid}>
            {t('students.subCard.markPaid')}
          </Button>
        </div>
      )}

      <Modal
        open={confirmDelete}
        title={t('students.subCard.deleteSubTitle', { type: subLabel(sub) })}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}
        onOk={() => {
          setConfirmDelete(false)
          onDeleteSub(sub.id)
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
