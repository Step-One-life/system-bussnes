import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, Form, Input, Modal, Segmented, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { usePricingRules } from 'entities/finance/api/use-finance'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'

import { studentKeys } from '../api/use-students'
import {
  addSubscription,
  linkPaymentToSub,
  updateStudent,
} from '../model/students.repo'
import { subLabel } from '../model/subscription-status'

import type { SubscriptionType } from '../model/types'
import type { RuleTuple } from 'entities/finance/lib/pricing-lookup'
import type { LessonKind, PricingRule } from 'entities/finance/model/types'

interface AddSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  studentGroups: string[]
  onClose: () => void
}

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
  const { data: locations = [] } = useLocations()

  const regularGroups = groups.filter((g) => !g.isIndividual)
  const [selected, setSelected] = useState<string[]>(
    studentGroups.filter((g) => regularGroups.some((rg) => rg.name === g)),
  )
  const [ruleId, setRuleId] = useState<string>('')
  const [slot, setSlot] = useState<'regular' | 'prime'>('regular')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  const isShared = selected.length > 1
  const primary = selected[0]
  const primaryGroup = groups.find((g) => g.name === primary) ?? null
  const isIndividual = primaryGroup?.isIndividual ?? false
  const lessonKind: LessonKind = isShared ? 'shared' : isIndividual ? 'individual' : 'group'

  // Локация группы (или дефолтная) — её тарифы и формируют список абонементов.
  const defaultLocId = locations.length
    ? (locations.find((l) => l.isDefault) ?? locations[0]).id
    : ''
  const locationId = primaryGroup?.locationId ?? defaultLocId
  const { data: rules = [] } = usePricingRules(locationId)

  // Варианты — активные тарифы нужного вида: разовое сверху, затем абонементы по возрастанию.
  const options = useMemo(() => {
    const matched = rules.filter((r) => r.active && r.lesson_kind === lessonKind)
    return [...matched].sort((a, b) =>
      a.format !== b.format
        ? a.format === 'single'
          ? -1
          : 1
        : a.sessions_count - b.sessions_count,
    )
  }, [rules, lessonKind])

  const selectedRule = options.find((r) => r.id === ruleId) ?? options[0] ?? null

  const priceOf = (r: PricingRule) => (slot === 'prime' ? r.client_prime_price : r.client_price)

  const submit = async () => {
    if (!selected.length) {
      toast({ type: 'warn', title: t('subscriptions.add.pickGroup') })
      return
    }
    if (!selectedRule) {
      toast({ type: 'warn', title: t('subscriptions.add.noTariff') })
      return
    }
    setSaving(true)
    try {
      // Ученик должен состоять в покрываемых группах, чтобы попадать в отметку.
      const missing = selected.filter((g) => !studentGroups.includes(g))
      if (missing.length) {
        await updateStudent(studentId, { groups: [...studentGroups, ...missing] })
      }

      const rule = selectedRule
      const tuple: RuleTuple = {
        lessonKind,
        format: rule.format,
        durationMinutes: rule.duration_minutes,
        sessionsCount: rule.sessions_count,
      }
      const subType: SubscriptionType = rule.format === 'single' ? '1' : 'sub'

      const createdSub = await addSubscription(studentId, {
        groupId: primary,
        groupIds: isShared ? selected : undefined,
        type: subType,
        sessionsTotal: rule.sessions_count,
        createdAt: date,
        sessionDuration: rule.duration_minutes,
        validityDays: rule.validity_days,
        timeSlot: slot,
      })

      if (createdSub) {
        const fin = await autoCreatePayment(
          studentId,
          {
            id: createdSub.id,
            type: subType,
            createdAt: date,
            tuple,
            sessionsTotal: rule.sessions_count,
          },
          isIndividual,
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
        <Form.Item
          label={t('subscriptions.add.typeLabel')}
          extra={options.length === 0 ? t('subscriptions.add.noTariffHint') : undefined}
        >
          <Select
            value={selectedRule?.id}
            onChange={setRuleId}
            placeholder={t('subscriptions.add.typePlaceholder')}
            notFoundContent={t('subscriptions.add.noTariffHint')}
            options={options.map((r) => ({
              value: r.id,
              label: `${subLabel({ total: r.sessions_count, sessionDuration: r.duration_minutes })} · ${priceOf(r)} ₽`,
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
