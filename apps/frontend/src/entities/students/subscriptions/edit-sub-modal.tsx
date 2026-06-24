import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { Button, Checkbox, DatePicker, Form, InputNumber, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { financeKeys, usePricingRules } from 'entities/finance/api/use-finance'
import { tuplePaymentType } from 'entities/finance/lib/auto-payment'
import { matchRule } from 'entities/finance/lib/pricing-lookup'
import { createPayment } from 'entities/finance/model/finance.repo'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'

import { useEditSubscription } from '../api/use-students'
import { isValidTotal, minTotal, prefillIncome, usedSessions } from './edit-sub'
import { subTuple } from './sub-tuple'

import type { Subscription } from '../model/types'
import type { Dayjs } from 'dayjs'

import dayjs from 'dayjs'

interface EditSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  sub: Subscription
  isIndividual: boolean
  onClose: () => void
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((x) => sb.has(x))
}

export function EditSubModal({
  open,
  studentId,
  studentName,
  sub,
  isIndividual,
  onClose,
}: EditSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const editSub = useEditSubscription()
  const { data: groups = [] } = useGroups()
  const { data: locations = [] } = useLocations()

  const [expiresAt, setExpiresAt] = useState(sub.expiresAt)
  const [total, setTotal] = useState(sub.total)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    sub.groupIds?.length ? sub.groupIds : [sub.groupId],
  )
  const [recordIncome, setRecordIncome] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const used = usedSessions(sub)
  const min = minTotal(sub)
  const addedCount = total - sub.total
  const showCount = !sub.isUnlimited
  const showGroups = !isIndividual
  const showIncome = showCount && addedCount > 0
  const validCount = isValidTotal(sub, total)
  const valid = validCount && selectedGroups.length >= 1

  // Префилл дохода: пропорция от цены тарифа исходного блока (тариф хранит цену
  // за весь блок). Локация — первичной группы абонемента (или дефолтная).
  const primaryGroup = groups.find((g) => g.name === sub.groupId) ?? null
  const defaultLocId = locations.length
    ? (locations.find((l) => l.isDefault) ?? locations[0]).id
    : ''
  const locationId = primaryGroup?.locationId ?? defaultLocId
  const { data: rules = [] } = usePricingRules(locationId)
  const isPrime = sub.timeSlot === 'prime'
  const matchedRule = useMemo(
    () => matchRule(rules, subTuple(sub, isIndividual)),
    [rules, sub, isIndividual],
  )
  const prefill = useMemo(
    () => prefillIncome(matchedRule, addedCount, isPrime),
    [matchedRule, addedCount, isPrime],
  )
  const amountValue = amount ?? prefill

  const regularGroups = groups.filter((g) => !g.isIndividual)

  const submit = async () => {
    if (saving || !valid) return
    setSaving(true)
    try {
      const changes: { total?: number; expiresAt?: string; groupIds?: string[] } = {}
      if (showCount && total !== sub.total) changes.total = total
      if (expiresAt !== sub.expiresAt) changes.expiresAt = expiresAt
      if (showGroups && !sameSet(selectedGroups, sub.groupIds ?? [sub.groupId])) {
        changes.groupIds = selectedGroups
      }

      if (Object.keys(changes).length > 0) {
        await editSub.mutateAsync({ studentId, subId: sub.id, changes })
      }

      // Доход за добавленные занятия — ОТДЕЛЬНЫЙ платёж, БЕЗ link-payment (иначе
      // перезатёрся бы finPaymentId уже оплаченного абонемента). Не блокирует edit.
      if (showIncome && recordIncome && amountValue && amountValue > 0) {
        try {
          await createPayment({
            student_id: studentId,
            location_id: locationId,
            client_payment_type: tuplePaymentType(subTuple(sub, isIndividual)),
            client_amount: amountValue,
            sessions_total: addedCount,
            paid_at: todayISO(),
            log_as_payment: true,
          })
          qc.invalidateQueries({ queryKey: financeKeys.payments })
        } catch {
          toast({ type: 'warn', title: t('subscriptions.edit.incomeFailed') })
        }
      }

      qc.invalidateQueries({ queryKey: ['students', studentId] })
      toast({ type: 'success', title: t('subscriptions.edit.saved'), msg: studentName })
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleDate = (d: Dayjs | null) => setExpiresAt(d ? d.format('YYYY-MM-DD') : sub.expiresAt)

  return (
    <AdaptiveSheet
      open={open}
      title={t('subscriptions.edit.titleWith', { name: studentName })}
      onClose={onClose}
      footer={
        <Button
          className="tk-btn-primary"
          type="primary"
          block
          loading={saving}
          disabled={!valid}
          onClick={submit}
        >
          {t('common.save')}
        </Button>
      }
    >
      <Form layout="vertical">
        <Form.Item label={t('subscriptions.edit.dateLabel')}>
          <DatePicker
            format="DD.MM.YYYY"
            allowClear={false}
            style={{ width: '100%' }}
            value={dayjs(expiresAt)}
            onChange={handleDate}
          />
        </Form.Item>

        {showCount && (
          <Form.Item
            label={t('subscriptions.edit.countLabel')}
            extra={t('subscriptions.edit.countUsedHint', { count: used })}
            validateStatus={validCount ? undefined : 'error'}
            help={validCount ? undefined : t('subscriptions.edit.countError', { count: used })}
          >
            <InputNumber
              min={min}
              precision={0}
              inputMode="numeric"
              style={{ width: '100%' }}
              value={total}
              onChange={(v) => setTotal(typeof v === 'number' ? v : sub.total)}
            />
          </Form.Item>
        )}

        {showGroups && (
          <Form.Item label={t('subscriptions.edit.groupsLabel')}>
            <Select
              mode="multiple"
              value={selectedGroups}
              onChange={setSelectedGroups}
              options={regularGroups.map((g) => ({ value: g.name, label: g.name }))}
            />
          </Form.Item>
        )}

        {showIncome && (
          <>
            <Form.Item style={{ marginBottom: 8 }}>
              <Checkbox
                checked={recordIncome}
                onChange={(e) => setRecordIncome(e.target.checked)}
              >
                {t('subscriptions.edit.recordIncome', { count: addedCount })}
              </Checkbox>
            </Form.Item>
            {recordIncome && (
              <Form.Item label={t('subscriptions.edit.incomeAmountLabel')}>
                <InputNumber
                  min={0}
                  controls={false}
                  inputMode="decimal"
                  style={{ width: '100%' }}
                  value={amountValue ?? undefined}
                  onChange={(v) => setAmount(typeof v === 'number' ? v : null)}
                />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </AdaptiveSheet>
  )
}
