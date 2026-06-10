import { useState } from 'react'

import { Button, Modal } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useStudents } from 'entities/students'

import {
  useCreateHallCost,
  useDeleteHallCost,
  useHallCosts,
  useUpdateHallCost,
  useUpdatePayment,
} from '../api/use-finance'
import { PaymentFormFields } from './payment-form-fields'
import { usePaymentForm } from './use-payment-form'

import type { HallCost, Payment } from '../model/types'
import type { Student } from 'entities/students'

interface EditPaymentModalProps {
  open: boolean
  payment: Payment | null
  onClose: () => void
}

export function EditPaymentModal({ open, payment, onClose }: EditPaymentModalProps) {
  const { data: students = [] } = useStudents()
  const { data: hallCosts = [] } = useHallCosts()

  const hallCost = payment?.hall_cost_id
    ? (hallCosts.find((c) => c.id === payment.hall_cost_id) ?? null)
    : null

  if (!payment) return null

  return (
    <EditPaymentModalInner
      key={`${payment.id}-${hallCost?.id ?? 'none'}`}
      open={open}
      payment={payment}
      hallCost={hallCost}
      students={students}
      onClose={onClose}
    />
  )
}

interface InnerProps {
  open: boolean
  payment: Payment
  hallCost: HallCost | null
  students: Student[]
  onClose: () => void
}

function EditPaymentModalInner({
  open,
  payment,
  hallCost,
  students,
  onClose,
}: InnerProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const updatePayment = useUpdatePayment()
  const createHallCost = useCreateHallCost()
  const updateHallCost = useUpdateHallCost()
  const deleteHallCost = useDeleteHallCost()
  const form = usePaymentForm({ payment, hallCost })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.date) {
      toast({ type: 'error', title: t('finance.form.dateRequired') })
      return
    }
    setSaving(true)
    try {
      let hallCostId = payment.hall_cost_id
      if (form.hallType) {
        if (hallCostId) {
          await updateHallCost.mutateAsync({
            id: hallCostId,
            changes: {
              hall_payment_type: form.hallType,
              time_slot: form.timeSlot,
              training_time: form.trainingTime,
              hall_amount: form.hallAmount,
              paid_at: form.date,
              notes: form.notes,
              student_id: form.studentId,
              location_id: form.locationId,
            },
          })
        } else {
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
      } else if (hallCostId) {
        await deleteHallCost.mutateAsync(hallCostId)
        hallCostId = null
      }

      await updatePayment.mutateAsync({
        id: payment.id,
        changes: {
          student_id: form.studentId,
          location_id: form.locationId,
          client_payment_type: form.clientType,
          client_amount: form.clientAmount,
          paid_at: form.date,
          notes: form.notes,
          hall_cost_id: hallCostId,
        },
      })
      onClose()
      toast({ type: 'success', title: t('finance.form.recordUpdated') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('finance.form.editTitle')}
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
      <PaymentFormFields form={form} students={students} />
    </Modal>
  )
}
