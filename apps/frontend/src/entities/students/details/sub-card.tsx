import { Button, Popconfirm } from 'antd'
import {
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge, SubProgressBar } from 'common/ui'

import { getSubStatus } from '../model/subscription-status'

import type { Student } from '../model/types'

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

  return (
    <div className="sub-card">
      <div className="sub-card__head">
        <span className="sub-card__title">{label}</span>
        <span style={{ marginLeft: 'auto' }}>
          <StatusBadge status={status} />
        </span>
        {anySub && (
          <Popconfirm
            title={t('students.subCard.deleteSubTitle')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={handleDeleteSub}
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </div>

      <SubProgressBar sub={activeSub ?? null} />

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
        <Button size="small" icon={<ReloadOutlined />} onClick={onRenew}>
          {t('students.subCard.newSub')}
        </Button>
        {onMarkPaid && anySub && !anySub.finPaymentId && (
          <Button
            size="small"
            icon={<DollarOutlined />}
            onClick={handleMarkPaid}
          >
            {t('students.subCard.markPaid')}
          </Button>
        )}
        {isIndividual && isRazovoe ? (
          <span className="sub-card__hint">
            <PhoneOutlined /> {t('students.subCard.askNextTraining')}
          </span>
        ) : (
          <Button type="text" size="small" icon={<ClockCircleOutlined />} onClick={onExtend}>
            {t('students.subCard.extendTerm')}
          </Button>
        )}
      </div>
    </div>
  )
}
