import { useState } from 'react'

import { Button, Dropdown, Modal } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  MessageOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge, StatusBadge, SubProgressBar } from 'common/ui'

import { getDaysRemaining, getSubStatus, subLabel } from '../model/subscription-status'
import { usePaymentReminder } from '../subscriptions/use-payment-reminder'

import type { Student, Subscription } from '../model/types'
import type { MenuProps } from 'antd'

interface SubCardProps {
  student: Student
  groupId: string
  isIndividual: boolean
  /** Списание/продление адресные: карточка передаёт СВОЙ абонемент. */
  onDeduct: (sub: Subscription) => void
  onRenew: () => void
  onExtend: (sub: Subscription) => void
  onEdit: (sub: Subscription) => void
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
  onEdit,
  onDeleteSub,
  onMarkPaid,
}: SubCardProps) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const remindPayment = usePaymentReminder()

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
    // Не оплачен → можно сразу напомнить: чат Telegram по номеру, текст
    // напоминания — в буфер (без телефона — просто в буфер).
    menuItems.push({
      key: 'remind',
      icon: <MessageOutlined />,
      label: t('students.contacts.remind'),
      onClick: () => remindPayment(student, anySub),
    })
  }
  if (anySub) {
    menuItems.push({
      key: 'edit',
      icon: <EditOutlined />,
      label: t('students.subCard.editSub'),
      onClick: () => onEdit(anySub),
    })
  }
  // Продлевать нечего без абонемента — пункт скрыт (раньше открывал модалку,
  // которая «продлевала» пустоту с тостом об успехе).
  if (anySub && !(isIndividual && isRazovoe)) {
    menuItems.push({
      key: 'extend',
      icon: <ClockCircleOutlined />,
      label: t('students.subCard.extendTerm'),
      onClick: () => onExtend(anySub),
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

  // Был абонемент, но не активен — осмысленный статус вместо прогресс-бара.
  // Совсем без абонемента текст не дублирует бейдж шапки — там кнопка
  // «+ Абонемент».
  const emptyDays = anySub ? getDaysRemaining(anySub) : null
  const emptyText =
    emptyDays !== null && emptyDays < 0
      ? t('students.subCard.expiredAgo', { count: -emptyDays })
      : anySub?.remaining === 0
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
      ) : anySub ? (
        <span className="sub-card__empty">{emptyText}</span>
      ) : (
        <Button
          className="sub-card__add"
          size="small"
          icon={<PlusOutlined />}
          onClick={onRenew}
        >
          {t('students.subCard.addSub')}
        </Button>
      )}

      {/* «Списать занятие» без активного абонемента скрыта, а не disabled. */}
      {activeSub && (
        <div className="sub-card__actions">
          <Button
            type="primary"
            size="small"
            icon={<MinusCircleOutlined />}
            disabled={activeSub.remaining <= 0}
            onClick={() => onDeduct(activeSub)}
          >
            {t('students.subCard.deductSession')}
          </Button>
          {isIndividual && isRazovoe && (
            <span className="sub-card__hint">
              <PhoneOutlined /> {t('students.subCard.askNextTraining')}
            </span>
          )}
        </div>
      )}

      {anySub && (
        <Modal
          open={confirmDelete}
          title={t('students.subCard.deleteSubTitle', { type: subLabel(anySub) })}
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
