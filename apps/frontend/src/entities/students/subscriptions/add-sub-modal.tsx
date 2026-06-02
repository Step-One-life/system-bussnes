import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, Form, Input, Modal, Segmented, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import {
  resolvePricingRule,
  resolvePricingRuleForShared,
  subTypeToTuple,
} from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { studentKeys } from '../api/use-students'
import {
  addSubscription,
  linkPaymentToSub,
  updateStudent,
} from '../model/students.repo'

import type { SubscriptionType } from '../model/types'

interface AddSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  studentGroups: string[]
  onClose: () => void
}

const SUB_TYPES: SubscriptionType[] = ['1', '4', '8']

export function AddSubModal({
  open,
  studentId,
  studentName,
  studentGroups,
  onClose,
}: AddSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: groups = [] } = useGroups()

  const regularGroups = groups.filter((g) => !g.isIndividual)
  const [selected, setSelected] = useState<string[]>(
    studentGroups.filter((g) => regularGroups.some((rg) => rg.name === g)),
  )
  const [type, setType] = useState<SubscriptionType>('8')
  const [slot, setSlot] = useState<'regular' | 'prime'>('regular')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  const isShared = selected.length > 1

  const submit = async () => {
    if (!selected.length) {
      toast({ type: 'warn', title: t('subscriptions.add.pickGroup') })
      return
    }
    setSaving(true)
    try {
      // Ученик должен состоять в покрываемых группах, чтобы попадать в отметку.
      const missing = selected.filter((g) => !studentGroups.includes(g))
      if (missing.length) {
        await updateStudent(studentId, { groups: [...studentGroups, ...missing] })
      }

      const primary = selected[0]
      const primaryGroup = groups.find((g) => g.name === primary) ?? null
      const tuple = subTypeToTuple(type, false)
      const { rule } = isShared
        ? await resolvePricingRuleForShared(primaryGroup?.locationId ?? null, {
            format: tuple.format,
            sessionsCount: tuple.sessionsCount,
          })
        : await resolvePricingRule(primaryGroup?.locationId ?? null, tuple)

      const createdSub = await addSubscription(studentId, {
        groupId: primary,
        groupIds: isShared ? selected : undefined,
        type,
        createdAt: date,
        validityDays: rule?.validity_days,
        timeSlot: slot,
      })

      if (createdSub) {
        const fin = await autoCreatePayment(
          studentId,
          { id: createdSub.id, type, createdAt: date },
          false,
          { isShared, isPrime: slot === 'prime', locationId: primaryGroup?.locationId ?? null },
        )
        if (fin) {
          await linkPaymentToSub(studentId, createdSub.id, fin.paymentId)
        } else {
          toast({ type: 'warn', title: t('finance.autoRecord.noTariff') })
        }
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['students', studentId] })
      toast({
        type: 'success',
        title: t('subscriptions.add.created'),
        msg: `${studentName} · ${selected.join(' + ')}`,
      })
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)

  return (
    <Modal
      open={open}
      title={t('subscriptions.add.title')}
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t('common.cancel')}
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={submit}>
          {t('subscriptions.add.createBtn')}
        </Button>,
      ]}
    >
      <Form layout="vertical">
        <Form.Item
          label={t('subscriptions.add.groupsLabel')}
          extra={isShared ? t('subscriptions.add.sharedHint') : t('subscriptions.add.singleHint')}
        >
          <Select
            mode="multiple"
            value={selected}
            onChange={setSelected}
            placeholder={t('subscriptions.add.groupsPlaceholder')}
            options={regularGroups.map((g) => ({ value: g.name, label: g.name }))}
          />
        </Form.Item>
        <Form.Item label={t('subscriptions.add.typeLabel')}>
          <Select
            value={type}
            onChange={setType}
            options={SUB_TYPES.map((v) => ({
              value: v,
              label: t(`subscriptions.add.type_${v}`),
            }))}
          />
        </Form.Item>
        <Form.Item label={t('finance.markPaid.timeSlotLabel')}>
          <Segmented
            block
            value={slot}
            onChange={(v) => setSlot(v as 'regular' | 'prime')}
            options={[
              { label: t('finance.markPaid.regular'), value: 'regular' },
              { label: t('finance.markPaid.prime'), value: 'prime' },
            ]}
          />
        </Form.Item>
        <Form.Item label={t('subscriptions.add.dateLabel')}>
          <Input type="date" value={date} onChange={handleDateChange} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
