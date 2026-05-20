import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, DatePicker, Form, InputNumber, Modal } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { FIN_LABELS } from 'entities/finance/model/finance-constants'
import { studentKeys } from 'entities/students/api/use-students'
import { linkPaymentToSub } from 'entities/students/model/students.repo'

import { useCreatePayment, usePricing } from '../api/use-finance'
import { subPaymentType } from '../lib/auto-payment'

import type { Dayjs } from 'dayjs'
import type { Student, Subscription } from 'entities/students'

import dayjs from 'dayjs'

interface MarkPaidModalProps {
  open: boolean
  student: Student | null
  sub: Subscription | null
  isIndividual: boolean
  onClose: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function MarkPaidModal({
  open,
  student,
  sub,
  isIndividual,
  onClose,
}: MarkPaidModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const createPayment = useCreatePayment()
  const { data: pricing } = usePricing()

  const paymentType = sub ? subPaymentType(sub.type, isIndividual) : null
  const typeLabel = paymentType ? (FIN_LABELS[paymentType] ?? paymentType) : t('common.dash')
  const defaultAmount = paymentType ? (pricing?.[`client_${paymentType}_price`] ?? 0) : 0

  const [amount, setAmount] = useState<number>(defaultAmount)
  const [date, setDate] = useState<string>(sub?.createdAt ?? today())
  const [pricedAmount, setPricedAmount] = useState(defaultAmount)

  if (defaultAmount !== pricedAmount) {
    setPricedAmount(defaultAmount)
    setAmount(defaultAmount)
  }

  if (!student || !sub) return null

  const handleAmountChange = (v: number | null) =>
    setAmount(typeof v === 'number' ? v : 0)
  const handleDateChange = (d: Dayjs | null) =>
    setDate(d ? d.format('YYYY-MM-DD') : '')

  const submit = async () => {
    try {
      const payment = await createPayment.mutateAsync({
        student_id: student.id,
        client_payment_type: paymentType ?? 'single_individual',
        client_amount: amount,
        paid_at: date,
      })
      await linkPaymentToSub(student.id, sub.id, payment.id)
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['students', student.id] })
      onClose()
      toast({ type: 'success', title: t('finance.markPaid.paid'), msg: student.name })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return (
    <Modal
      open={open}
      title={t('finance.markPaid.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={createPayment.isPending}
          onClick={submit}
        >
          {t('finance.markPaid.markPaidBtn')}
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          {t('finance.markPaid.client')}
        </div>
        <div style={{ fontWeight: 600 }}>{student.name}</div>
      </div>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          {t('finance.markPaid.type')}
        </div>
        <div style={{ fontWeight: 600 }}>{typeLabel}</div>
      </div>
      <Form layout="vertical">
        <Form.Item label={t('finance.markPaid.amountLabel')}>
          <InputNumber
            min={0}
            value={amount}
            controls={false}
            style={{ width: '100%' }}
            onChange={handleAmountChange}
          />
        </Form.Item>
        <Form.Item label={t('finance.markPaid.dateLabel')}>
          <DatePicker
            value={date ? dayjs(date) : null}
            format="DD.MM.YYYY"
            allowClear={false}
            style={{ width: '100%' }}
            onChange={handleDateChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
