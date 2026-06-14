import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button, Checkbox, DatePicker, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO, tomorrowISO } from 'common/utils/date'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { resolvePricingRule, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { useAddSubscription, useStudents } from '../api/use-students'
import { linkPaymentToSub } from '../model/students.repo'
import { resolveStartDate } from './renew-date'

import type { SubscriptionType } from '../model/types'
import type { StartMode } from './renew-date'
import type { Dayjs } from 'dayjs'

import './renew-sub-modal.scss'
import dayjs from 'dayjs'

interface RenewSubModalProps {
  open: boolean
  studentId: string
  studentName: string
  groupId: string
  onClose: () => void
  /** «Оформить абонемент» вместо «Продлить» — для ученика без абонемента. */
  issueMode?: boolean
  /** Вызывается только при успешном создании (onClose зовётся и при отмене). */
  onCreated?: () => void
}

export function RenewSubModal({
  open,
  studentId,
  studentName,
  groupId,
  onClose,
  issueMode = false,
  onCreated,
}: RenewSubModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const addSubscription = useAddSubscription()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const [dateMode, setDateMode] = useState<StartMode>('today')
  const [customDate, setCustomDate] = useState(todayISO())
  const [paidNow, setPaidNow] = useState(true)
  const [saving, setSaving] = useState(false)

  // groupId приходит и как имя (из warnings/гейтов), и как UUID — резолвим оба.
  const group = groups.find((g) => g.name === groupId || g.id === groupId) ?? null
  const groupName = group?.name ?? groupId

  // Предыдущий абонемент ученика по данной группе (на уровне рендера).
  const prevSub = useMemo(() => {
    const resolvedName = groups.find((g) => g.name === groupId || g.id === groupId)?.name ?? groupId
    const subs = students.find((s) => s.id === studentId)?.subscriptions ?? []
    return (
      [...subs]
        .filter((s) => s.groupId === resolvedName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    )
  }, [students, studentId, groups, groupId])

  // Тип фиксирован: прошлый абонемент (нормализован) или разовое при оформлении.
  const type = (prevSub?.type ?? '1').replace('_90', '').replace('_pair', '') as SubscriptionType

  // Итоговая дата начала из выбранного режима.
  const date = resolveStartDate(dateMode, todayISO(), tomorrowISO(), customDate)

  // Живая цена выбранного типа абонемента.
  const { data: priceRule } = useQuery({
    queryKey: ['renew-price', groupId, type],
    queryFn: () =>
      resolvePricingRule(group?.locationId ?? null, subTypeToTuple(type, group?.isIndividual ?? false)),
    enabled: open,
  })
  const slot = prevSub?.timeSlot ?? 'regular'
  const price = priceRule?.rule
    ? slot === 'prime'
      ? priceRule.rule.client_prime_price
      : priceRule.rule.client_price
    : null

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      // validity_days — отдельным запросом (гарантия актуальности, не из кэша).
      const { rule } = await resolvePricingRule(
        group?.locationId ?? null,
        subTypeToTuple(type, group?.isIndividual ?? false),
      )

      const createdSub = await addSubscription.mutateAsync({
        studentId,
        data: {
          groupId,
          type,
          createdAt: date,
          validityDays: rule?.validity_days,
          // Наследуем слот (прайм/обычный) от предыдущего абонемента группы.
          timeSlot: prevSub?.timeSlot ?? 'regular',
        },
      })

      if (paidNow && createdSub) {
        const fin = await autoCreatePayment(
          studentId,
          { id: createdSub.id, type, createdAt: date },
          group?.isIndividual ?? false,
          { isPrime: slot === 'prime', locationId: group?.locationId ?? null },
        )
        if (fin) {
          await linkPaymentToSub(studentId, createdSub.id, fin.paymentId)
        } else {
          toast({ type: 'warn', title: t('finance.autoRecord.noTariff') })
        }
      }

      toast({
        type: 'success',
        title: issueMode ? t('subscriptions.issue.created') : t('subscriptions.renew.subRenewed'),
        msg: `${studentName} · ${groupName}`,
      })
      onCreated?.()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleDateMode = (v: StartMode) => setDateMode(v)
  const handleCustom = (d: Dayjs | null) => setCustomDate(d ? d.format('YYYY-MM-DD') : todayISO())

  const typeLabel = t(`students.subTypes.${type}`, { defaultValue: type })
  const priceText = price !== null ? `${typeLabel} · ${price} ₽` : typeLabel

  return (
    <AdaptiveSheet
      open={open}
      title={t(issueMode ? 'subscriptions.issue.titleWith' : 'subscriptions.renew.titleWith', {
        name: studentName,
        group: groupName,
      })}
      onClose={onClose}
      footer={
        <Button className="tk-btn-primary" type="primary" block loading={saving} onClick={submit}>
          {issueMode ? t('subscriptions.issue.createBtn') : t('common.extend')}
        </Button>
      }
    >
      <div className="renew-sheet">
        <div className="renew-row">
          <span className="renew-row__label">
            {issueMode
              ? t('subscriptions.renew.tariffLabel')
              : t('subscriptions.renew.asPrevLabel')}
          </span>
          <span className="renew-row__value">{priceText}</span>
        </div>
        <div className="renew-row">
          <span className="renew-row__label">{t('subscriptions.renew.startLabel')}</span>
          <Select
            value={dateMode}
            onChange={handleDateMode}
            variant="borderless"
            popupMatchSelectWidth={false}
            options={[
              { value: 'today', label: t('subscriptions.renew.startToday') },
              { value: 'tomorrow', label: t('subscriptions.renew.startTomorrow') },
              { value: 'custom', label: t('subscriptions.renew.startCustom') },
            ]}
          />
        </div>
        {dateMode === 'custom' && (
          <DatePicker
            format="DD.MM.YYYY"
            style={{ width: '100%' }}
            value={dayjs(customDate)}
            onChange={handleCustom}
          />
        )}
        <label className="renew-paid">
          <Checkbox checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
          <span className="renew-paid__text">
            {t('subscriptions.renew.paidNow')}
            {paidNow && price !== null && (
              <span className="renew-paid__hint">
                {t('subscriptions.renew.paidNowHint', { amount: price })}
              </span>
            )}
          </span>
        </label>
      </div>
    </AdaptiveSheet>
  )
}
