import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, DatePicker, Form, InputNumber, Segmented } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { finLabel } from 'entities/finance/model/finance-constants'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'
import { studentKeys } from 'entities/students/api/use-students'
import { linkPaymentToSub } from 'entities/students/model/students.repo'

import { useCreateHallCost, useCreatePayment, usePricingRules } from '../api/use-finance'
import { subPaymentType } from '../lib/auto-payment'
import { matchRule, subTypeToTuple } from '../lib/pricing-lookup'

import type { HallPaymentType, TimeSlot } from '../model/types'
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
  return todayISO()
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
  const createHallCost = useCreateHallCost()
  const { data: groups = [] } = useGroups()
  const { data: locations = [] } = useLocations()

  // Resolve the subscription's location via its group, else the default one.
  const subGroup = sub ? (groups.find((g) => g.name === sub.groupId) ?? null) : null
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0] ?? null
  const locationId = subGroup?.locationId ?? defaultLocation?.id ?? ''
  const { data: rules = [] } = usePricingRules(locationId)

  const paymentType = sub ? subPaymentType(sub.type, isIndividual) : null
  const typeLabel = paymentType ? finLabel(paymentType) : t('common.dash')
  const matchedRule = sub ? matchRule(rules, subTypeToTuple(sub.type, isIndividual)) : null

  // Слот предзаполняется тем, по которому абонемент покупался (sub.timeSlot),
  // чтобы прайм-абонемент не отметили оплаченным по обычной цене; тренер может
  // переключить. Слот двигает и цену клиента, и расход зала из тарифа.
  const [slot, setSlot] = useState<TimeSlot>(sub?.timeSlot ?? 'regular')
  const [slotSubId, setSlotSubId] = useState(sub?.id)
  if (slotSubId !== sub?.id) {
    // Модалку переоткрыли с другим абонементом — пересинхронизировать слот.
    setSlotSubId(sub?.id)
    setSlot(sub?.timeSlot ?? 'regular')
  }
  const defaultAmount =
    (slot === 'prime' ? matchedRule?.client_prime_price : matchedRule?.client_price) ?? 0
  const defaultHall =
    (slot === 'prime' ? matchedRule?.hall_prime_cost : matchedRule?.hall_cost) ?? 0

  const [amount, setAmount] = useState<number>(defaultAmount)
  const [hallAmount, setHallAmount] = useState<number>(defaultHall)
  const [date, setDate] = useState<string>(sub?.createdAt ?? today())
  const [priced, setPriced] = useState(`${defaultAmount}|${defaultHall}`)

  if (priced !== `${defaultAmount}|${defaultHall}`) {
    setPriced(`${defaultAmount}|${defaultHall}`)
    setAmount(defaultAmount)
    setHallAmount(defaultHall)
  }

  if (!student || !sub) return null

  const handleAmountChange = (v: number | null) =>
    setAmount(typeof v === 'number' ? v : 0)
  const handleHallChange = (v: number | null) =>
    setHallAmount(typeof v === 'number' ? v : 0)
  const handleDateChange = (d: Dayjs | null) =>
    setDate(d ? d.format('YYYY-MM-DD') : '')

  const saving = createPayment.isPending || createHallCost.isPending

  const submit = async () => {
    try {
      // Hall expense first so the income payment can link to it.
      const hallCost = await createHallCost.mutateAsync({
        student_id: student.id,
        location_id: locationId || null,
        hall_payment_type: (paymentType ?? 'single_individual') as HallPaymentType,
        time_slot: slot,
        training_time: '',
        hall_amount: hallAmount,
        paid_at: date,
      })
      const payment = await createPayment.mutateAsync({
        student_id: student.id,
        location_id: locationId || null,
        client_payment_type: paymentType ?? 'single_individual',
        client_amount: amount,
        hall_cost_id: hallCost.id,
        paid_at: date,
      })
      await linkPaymentToSub(student.id, sub.id, payment.id, { logAsPayment: true, amount })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['students', student.id] })
      onClose()
      toast({ type: 'success', title: t('finance.markPaid.paid'), msg: student.name })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return (
    <AdaptiveSheet
      open={open}
      title={t('finance.markPaid.title')}
      onClose={onClose}
      footer={
        <>
          <Button key="cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            key="save"
            type="primary"
            loading={saving}
            onClick={submit}
          >
            {t('finance.markPaid.markPaidBtn')}
          </Button>
        </>
      }
    >
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--tk-text-secondary)', fontSize: '0.8rem' }}>
          {t('finance.markPaid.client')}
        </div>
        <div style={{ fontWeight: 600 }}>{student.name}</div>
      </div>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--tk-text-secondary)', fontSize: '0.8rem' }}>
          {t('finance.markPaid.type')}
        </div>
        <div style={{ fontWeight: 600 }}>{typeLabel}</div>
      </div>
      <Form layout="vertical">
        <Form.Item label={t('finance.markPaid.timeSlotLabel')}>
          <Segmented
            block
            value={slot}
            onChange={(v) => setSlot(v as TimeSlot)}
            options={[
              { label: t('finance.markPaid.regular'), value: 'regular' },
              { label: t('finance.markPaid.prime'), value: 'prime' },
            ]}
          />
        </Form.Item>
        <Form.Item label={t('finance.markPaid.amountLabel')}>
          <InputNumber
            min={0}
            value={amount}
            controls={false}
            inputMode="decimal"
            style={{ width: '100%' }}
            onChange={handleAmountChange}
          />
        </Form.Item>
        <Form.Item label={t('finance.markPaid.hallAmountLabel')}>
          <InputNumber
            min={0}
            value={hallAmount}
            controls={false}
            inputMode="decimal"
            style={{ width: '100%' }}
            onChange={handleHallChange}
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
    </AdaptiveSheet>
  )
}
