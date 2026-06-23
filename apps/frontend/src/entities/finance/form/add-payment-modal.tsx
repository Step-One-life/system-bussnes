import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, Modal, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { studentKeys } from 'entities/students/api/use-students'
import { linkPaymentToSub } from 'entities/students/model/students.repo'
import { subLabel } from 'entities/students/model/subscription-status'
import { findUnpaidSubscriptions } from 'entities/students/subscriptions/unpaid-subs'

import { useCreateHallCost, useCreatePayment } from '../api/use-finance'
import { PaymentFormFields } from './payment-form-fields'
import { usePaymentForm } from './use-payment-form'

import dayjs from 'dayjs'

interface AddPaymentModalProps {
  open: boolean
  onClose: () => void
}

export function AddPaymentModal({ open, onClose }: AddPaymentModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const createPayment = useCreatePayment()
  const createHallCost = useCreateHallCost()
  const form = usePaymentForm()

  // Неоплаченные абонементы выбранного клиента (только режим «Клиент»): доход
  // можно сразу засчитать за один из них, чтобы не плодить «осиротевшую» запись.
  const selectedStudent =
    form.clientMode === 'student' && form.studentId
      ? (students.find((s) => s.id === form.studentId) ?? null)
      : null
  const unpaidSubs = selectedStudent ? findUnpaidSubscriptions(selectedStudent.subscriptions) : []

  // По умолчанию засчитываем за самый свежий неоплаченный; при смене клиента —
  // пересинхронизируем выбор (включая «Не привязывать», если абонементов нет).
  const [attachSubId, setAttachSubId] = useState<string | null>(unpaidSubs[0]?.id ?? null)
  const [attachKey, setAttachKey] = useState(form.studentId)
  if (attachKey !== form.studentId) {
    setAttachKey(form.studentId)
    setAttachSubId(unpaidSubs[0]?.id ?? null)
  }

  const saving = createPayment.isPending || createHallCost.isPending

  const persist = async () => {
    let hallCostId: string | null = null
    if (form.hallType) {
      const hc = await createHallCost.mutateAsync({
        student_id: form.studentId,
        location_id: form.locationId,
        hall_payment_type: form.hallType,
        time_slot: form.timeSlot,
        training_time: form.trainingTime,
        hall_amount: form.hallAmount,
        paid_at: form.date,
        notes: form.notes,
      })
      hallCostId = hc.id
    }
    const payment = await createPayment.mutateAsync({
      student_id: form.studentId,
      group_id: form.groupId,
      location_id: form.locationId,
      client_payment_type: form.clientType,
      client_amount: form.clientAmount,
      paid_at: form.date,
      notes: form.notes,
      hall_cost_id: hallCostId,
      // Ручная оплата — в журнал (payment_recorded). Привязка к абонементу ниже
      // НЕ логируется (link-payment без logAsPayment), поэтому записи не дублируются.
      log_as_payment: true,
    })
    // Засчитать за неоплаченный абонемент: ставит finPaymentId, чтобы карточка
    // ушла из «Требует внимания» и доход не остался «осиротевшим».
    if (attachSubId && form.studentId) {
      await linkPaymentToSub(form.studentId, attachSubId, payment.id)
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['students', form.studentId] })
    }
    onClose()
    toast({ type: 'success', title: t('finance.form.recordAdded') })
  }

  const submit = async () => {
    if (!form.date) {
      toast({ type: 'error', title: t('finance.form.dateRequired') })
      return
    }
    try {
      if (form.net < 0 && form.clientAmount > 0) {
        Modal.confirm({
          title: t('finance.form.expenseExceedsTitle'),
          content: t('finance.form.expenseExceedsContent', {
            hall: form.hallAmount,
            client: form.clientAmount,
            net: form.net,
          }),
          okText: t('common.continue'),
          cancelText: t('common.cancel'),
          onOk: persist,
        })
        return
      }
      await persist()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return (
    <Modal
      open={open}
      title={t('finance.form.addTitle')}
      width="min(620px, 95vw)"
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={submit}>
          {t('common.save')}
        </Button>,
      ]}
    >
      <PaymentFormFields form={form} students={students} groups={groups} />
      {unpaidSubs.length > 0 && (
        <div
          style={{
            marginTop: 'var(--sp-4)',
            padding: 'var(--sp-3)',
            border: '1px solid var(--tk-accent-subtle-border)',
            borderRadius: 'var(--tk-radius-card)',
            background: 'var(--tk-accent-subtle-bg)',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--tk-accent-text)' }}>
            {t('finance.form.attachTitle')}
          </div>
          <div
            style={{
              color: 'var(--tk-text-secondary)',
              fontSize: '0.8rem',
              marginTop: 'var(--sp-1)',
              marginBottom: 'var(--sp-2)',
            }}
          >
            {t('finance.form.attachHint')}
          </div>
          <Select
            style={{ width: '100%' }}
            value={attachSubId ?? ''}
            onChange={(v) => setAttachSubId(v || null)}
            options={[
              ...unpaidSubs.map((s) => ({
                value: s.id,
                label: `${subLabel(s)} · ${s.groupId} · ${dayjs(s.createdAt).format('DD.MM.YYYY')}`,
              })),
              { value: '', label: t('finance.form.attachNone') },
            ]}
          />
        </div>
      )}
    </Modal>
  )
}
