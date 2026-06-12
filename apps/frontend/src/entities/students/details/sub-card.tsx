import { useState } from 'react'

import { Button, Dropdown, Modal } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge, StatusBadge, SubProgressBar } from 'common/ui'

import { getDaysRemaining, getSubStatus, subTypeLabel } from '../model/subscription-status'

import type { Student } from '../model/types'
import type { MenuProps } from 'antd'

interface SubCardProps {
  student: Student
  groupId: string
  isIndividual: boolean
  onDeduct: () => void
  onRenew: () => void
  onExtend: () => void
  onDeleteSub: (subId: string) => void
  onMarkPaid?: (subId: string) => void
}

export function SubCard({
  student,
  groupId,
  isIndividual,
  onDeduct,
  onRenew,
  onExtend,
  onDeleteSub,
  onMarkPaid,
}: SubCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const activeSub = student.subscriptions.find((s) => s.groupId === groupId && s.isActive)
  const anySub =
    activeSub ??
    [...student.subscriptions]
      .filter((s) => s.groupId === groupId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  const status = getSubStatus(student, groupId)
  const isRazovoe = activeSub?.type === '1'
  const label = isIndividual ? t('students.subCard.indTraining') : groupId

  const handleDeleteSub = () => anySub && onDeleteSub(anySub.id)
  const handleMarkPaid = () => anySub && onMarkPaid?.(anySub.id)
  const handleCloseConfirmDelete = () => setConfirmDelete(false)

  // Вторичные действия — в меню «…», видимой остаётся только частая
  // кнопка «Списать занятие».
  const menuItems: MenuProps['items'] = [
    {
      key: 'renew',
      icon: <ReloadOutlined />,
      label: t('students.subCard.newSub'),
      onClick: onRenew,
    },
  ]
  if (onMarkPaid && anySub && !anySub.finPaymentId) {
    menuItems.push({
      key: 'markPaid',
      icon: <DollarOutlined />,
      label: t('students.subCard.markPaid'),
      onClick: handleMarkPaid,
    })
  }
  if (!(isIndividual && isRazovoe)) {
    menuItems.push({
      key: 'extend',
      icon: <ClockCircleOutlined />,
      label: t('students.subCard.extendTerm'),
      onClick: onExtend,
    })
  }
  if (anySub) {
    menuItems.push(
      { type: 'divider' },
      {
        key: 'deleteSub',
        danger: true,
        icon: <DeleteOutlined />,
        label: t('students.subCard.deleteSub'),
        onClick: () => setConfirmDelete(true),
      },
    )
  }

  // Без активного абонемента вместо прогресс-бара — осмысленный статус.
  const emptyDays = anySub ? getDaysRemaining(anySub) : null
  const emptyText = !anySub
    ? t('students.subCard.noSubYet')
    : emptyDays !== null && emptyDays < 0
      ? t('students.subCard.expiredAgo', { count: -emptyDays })
      : anySub.remaining === 0
        ? t('students.subCard.zeroSessions')
        : t('students.subCard.noSubYet')

  return (
    <div className="sub-card">
      <div className="sub-card__head">
        <span className="sub-card__title">{label}</span>
        {/* Абонемент куплен по прайм-тарифу — видно без открытия оплаты. */}
        {anySub?.timeSlot === 'prime' && (
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

      {activeSub ? (
        <SubProgressBar sub={activeSub} />
      ) : (
        <span className="sub-card__empty">{emptyText}</span>
      )}

      <div className="sub-card__actions">
        <Button
          type="primary"
          size="small"
          icon={<MinusCircleOutlined />}
          disabled={!activeSub || activeSub.remaining <= 0}
          onClick={onDeduct}
        >
          {t('students.subCard.deductSession')}
        </Button>
        {isIndividual && isRazovoe && (
          <span className="sub-card__hint">
            <PhoneOutlined /> {t('students.subCard.askNextTraining')}
          </span>
        )}
      </div>

      {anySub && (
        <Modal
          open={confirmDelete}
          title={t('students.subCard.deleteSubTitle', { type: subTypeLabel(anySub.type) })}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onOk={() => {
            setConfirmDelete(false)
            handleDeleteSub()
          }}
          onCancel={handleCloseConfirmDelete}
        />
      )}
    </div>
  )
}
