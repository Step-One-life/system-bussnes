import { Button, Modal } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'

import { useCreateHallCost, useCreatePayment } from '../api/use-finance'
import { PaymentFormFields } from './payment-form-fields'
import { usePaymentForm } from './use-payment-form'

interface AddPaymentModalProps {
  open: boolean
  onClose: () => void
}

export function AddPaymentModal({ open, onClose }: AddPaymentModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: students = [] } = useStudents()
  const { data: groups = [] } = useGroups()
  const createPayment = useCreatePayment()
  const createHallCost = useCreateHallCost()
  const form = usePaymentForm()

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
    await createPayment.mutateAsync({
      student_id: form.studentId,
      group_id: form.groupId,
      location_id: form.locationId,
      client_payment_type: form.clientType,
      client_amount: form.clientAmount,
      paid_at: form.date,
      notes: form.notes,
      hall_cost_id: hallCostId,
    })
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
    </Modal>
  )
}
