import { useState } from 'react'

import { Button, Popconfirm } from 'antd'
import { DeleteOutlined, DownOutlined, EditOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { Badge } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { finLabel } from 'entities/finance/model/finance-constants'

import type { HallCost, Payment } from '../model/types'

interface FinanceRecordCardProps {
  payment: Payment
  hallCost: HallCost | null
  studentName: string | null
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
}

export function FinanceRecordCard({
  payment,
  hallCost,
  studentName,
  onEdit,
  onDelete,
}: FinanceRecordCardProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const statusMap: Record<string, { variant: 'active' | 'neutral'; label: string }> = {
    active: { variant: 'active', label: t('finance.card.statusActive') },
    closed: { variant: 'neutral', label: t('finance.card.statusClosed') },
  }

  const handleToggleOpen = () => setOpen((v) => !v)
  const handleEdit = () => onEdit(payment)
  const handleDelete = () => onDelete(payment)

  const net = payment.client_amount - (hallCost?.hall_amount ?? 0)
  const netColor = net >= 0 ? 'var(--tk-success-text)' : 'var(--tk-danger-text)'
  const status = statusMap[payment.status] ?? { variant: 'neutral', label: payment.status }
  const clientLabel = finLabel(payment.client_payment_type)

  return (
    <div className={`fin-record${open ? ' is-open' : ''}`}>
      <div className="fin-record__header" onClick={handleToggleOpen}>
        <div className="fin-record__meta">
          <span className="fin-record__name">{studentName ?? '—'}</span>
          <span className="fin-record__date">{formatDateShort(payment.paid_at)}</span>
        </div>
        <div className="fin-record__summary">
          <span className="fin-record__income">
            +{payment.client_amount.toLocaleString('ru')} ₽
          </span>
          {/* Нулевой расход в свёрнутой строке — шум («−0 ₽»), скрываем */}
          {hallCost && hallCost.hall_amount > 0 && (
            <span className="fin-record__expense">
              −{hallCost.hall_amount.toLocaleString('ru')} ₽
            </span>
          )}
          <span className="fin-record__net" style={{ color: netColor }}>
            {net >= 0 ? '+' : ''}
            {net.toLocaleString('ru')} ₽
          </span>
        </div>
        <DownOutlined className="fin-record__chevron" />
      </div>

      {open && (
        <div className="fin-record__body">
          <div className="fin-record__row">
            <span className="fin-record__row-label">{t('finance.card.clientPays')}</span>
            <span className="fin-record__row-value">
              <Badge variant="neutral">{clientLabel}</Badge>
              <span style={{ color: 'var(--tk-success-text)' }}>
                +{payment.client_amount.toLocaleString('ru')} ₽
              </span>
            </span>
          </div>
          {hallCost && (
            <div className="fin-record__row">
              <span className="fin-record__row-label">{t('finance.card.hallExpense')}</span>
              <span className="fin-record__row-value">
                <Badge variant="neutral">
                  {finLabel(hallCost.hall_payment_type)}
                </Badge>
                {hallCost.time_slot === 'prime' && (
                  <Badge variant="warn">{t('finance.card.prime')}</Badge>
                )}
                <span
                  style={{
                    color: hallCost.hall_amount > 0 ? 'var(--tk-danger-text)' : 'var(--tk-text-tertiary)',
                  }}
                >
                  {hallCost.hall_amount > 0 ? '−' : ''}
                  {hallCost.hall_amount.toLocaleString('ru')} ₽
                </span>
              </span>
            </div>
          )}
          <div className="fin-record__row">
            <span className="fin-record__row-label">{t('finance.card.netIncome')}</span>
            <strong style={{ color: netColor }}>
              {net >= 0 ? '+' : ''}
              {net.toLocaleString('ru')} ₽
            </strong>
          </div>
          <div className="fin-record__row">
            <span className="fin-record__row-label">{t('finance.card.sessions')}</span>
            <span className="fin-record__row-value">
              {payment.sessions_remaining}/{payment.sessions_total}
              <Badge variant={status.variant}>{status.label}</Badge>
            </span>
          </div>
          {/* Примечание — только если оно вписано; пустое не показываем */}
          {payment.notes.trim() && (
            <div className="fin-record__row fin-record__row--note">
              <span className="fin-record__row-label">{t('finance.card.notes')}</span>
              <span className="fin-record__note">{payment.notes}</span>
            </div>
          )}
          <div className="fin-record__actions">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              {t('finance.card.edit')}
            </Button>
            <Popconfirm
              title={t('finance.card.deleteTitle', {
                name: [studentName ?? clientLabel, formatDateShort(payment.paid_at)].join(
                  ' · ',
                ),
              })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={handleDelete}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('common.delete')}
              />
            </Popconfirm>
          </div>
        </div>
      )}
    </div>
  )
}
