import { useState } from 'react'

import { Button, Modal } from 'antd'
import { DollarOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { MarkPaidModal } from 'entities/finance'
import { subLabel } from 'entities/students'

import { useUnpaidSubs } from './use-unpaid-subs'

import type { UnpaidSub } from './use-unpaid-subs'

import './unpaid-subs-modal.scss'

interface UnpaidSubsModalProps {
  open: boolean
  onClose: () => void
}

export function UnpaidSubsModal({ open, onClose }: UnpaidSubsModalProps) {
  const { t } = useTranslation()
  const { unpaid } = useUnpaidSubs()
  const [paying, setPaying] = useState<UnpaidSub | null>(null)

  const handleClosePay = () => setPaying(null)

  return (
    <>
      <Modal
        open={open}
        title={t('home.unpaidModal.title')}
        onCancel={onClose}
        footer={null}
      >
        {unpaid.length === 0 ? (
          <p className="unpaid-empty">{t('home.unpaidModal.allPaid')}</p>
        ) : (
          <div className="unpaid-list">
            {unpaid.map((u) => {
              const typeLabel = u.isIndividual
                ? t('home.indTraining')
                : `${u.groupId} · ${subLabel(u.sub)}`
              const handlePay = () => setPaying(u)
              return (
                <div key={u.sub.id} className="unpaid-row">
                  <div className="unpaid-row__info">
                    <span className="unpaid-row__name">{u.student.name}</span>
                    <span className="unpaid-row__type">{typeLabel}</span>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<DollarOutlined />}
                    onClick={handlePay}
                  >
                    {t('students.subCard.markPaid')}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {paying && (
        <MarkPaidModal
          open
          student={paying.student}
          sub={paying.sub}
          isIndividual={paying.isIndividual}
          onClose={handleClosePay}
        />
      )}
    </>
  )
}
