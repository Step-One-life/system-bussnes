import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button, Checkbox, DatePicker, Select } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO, tomorrowISO } from 'common/utils/date'
import { usePricingRules } from 'entities/finance/api/use-finance'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { resolvePricingRule } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'

import { useAddSubscription, useStudents } from '../api/use-students'
import { linkPaymentToSub } from '../model/students.repo'
import { subLabel } from '../model/subscription-status'
import { resolveStartDate } from './renew-date'
import { subTuple } from './sub-tuple'

import type { SubscriptionType } from '../model/types'
import type { StartMode } from './renew-date'
import type { Dayjs } from 'dayjs'
import type { RuleTuple } from 'entities/finance/lib/pricing-lookup'
import type { LessonKind } from 'entities/finance/model/types'

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
  const { data: locations = [] } = useLocations()
  const [dateMode, setDateMode] = useState<StartMode>('today')
  const [customDate, setCustomDate] = useState(todayISO())
  const [paidNow, setPaidNow] = useState(true)
  const [ruleId, setRuleId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // groupId приходит и как имя (из warnings/гейтов), и как UUID — резолвим оба.
  const group = groups.find((g) => g.name === groupId || g.id === groupId) ?? null
  const groupName = group?.name ?? groupId
  const isIndividual = group?.isIndividual ?? false
  const lessonKind: LessonKind = isIndividual ? 'individual' : 'group'

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

  // Локация группы (или дефолтная) — для списка тарифов при оформлении.
  const defaultLocId = locations.length
    ? (locations.find((l) => l.isDefault) ?? locations[0]).id
    : ''
  const locationId = group?.locationId ?? defaultLocId
  const { data: rules = [] } = usePricingRules(issueMode ? locationId : '')

  // Оформление: список тарифов нужного вида (разовое сверху, затем абонементы).
  const options = useMemo(() => {
    if (!issueMode) return []
    const matched = rules.filter((r) => r.active && r.lesson_kind === lessonKind)
    return [...matched].sort((a, b) =>
      a.format !== b.format
        ? a.format === 'single'
          ? -1
          : 1
        : a.sessions_count - b.sessions_count,
    )
  }, [issueMode, rules, lessonKind])

  const selectedRule = issueMode ? (options.find((r) => r.id === ruleId) ?? options[0] ?? null) : null

  // Контекст абонемента: оформление — из выбранного тарифа, продление — из прошлого.
  const tuple: RuleTuple | null = issueMode
    ? selectedRule
      ? {
          lessonKind,
          format: selectedRule.format,
          durationMinutes: selectedRule.duration_minutes,
          sessionsCount: selectedRule.sessions_count,
        }
      : null
    : prevSub
      ? subTuple(prevSub, isIndividual)
      : null
  const total = issueMode ? (selectedRule?.sessions_count ?? 1) : (prevSub?.total ?? 1)
  const sessionDuration = issueMode
    ? (selectedRule?.duration_minutes ?? 60)
    : (prevSub?.sessionDuration ?? 60)
  const subType: SubscriptionType = issueMode
    ? selectedRule?.format === 'single'
      ? '1'
      : 'sub'
    : (prevSub?.type ?? '1')
  const slot = prevSub?.timeSlot ?? 'regular'
  const isUnlimited = issueMode
    ? selectedRule?.format === 'unlimited'
    : (prevSub?.isUnlimited ?? false)

  // Итоговая дата начала из выбранного режима.
  const date = resolveStartDate(dateMode, todayISO(), tomorrowISO(), customDate)

  // Цена/срок продления: резолв тарифа по кортежу (оформление берёт из selectedRule).
  const { data: renewRule } = useQuery({
    queryKey: ['renew-price', groupId, total, sessionDuration, lessonKind],
    queryFn: () => resolvePricingRule(group?.locationId ?? null, tuple as RuleTuple),
    enabled: open && !issueMode && !!tuple,
  })
  const priceRule = issueMode ? selectedRule : (renewRule?.rule ?? null)
  const price = priceRule
    ? slot === 'prime'
      ? priceRule.client_prime_price
      : priceRule.client_price
    : null

  const submit = async () => {
    if (saving) return
    if (!tuple) {
      toast({ type: 'warn', title: t('subscriptions.add.noTariff') })
      return
    }
    setSaving(true)
    try {
      // validity_days — из выбранного тарифа (оформление) или свежим запросом (продление).
      const validityDays = issueMode
        ? selectedRule?.validity_days
        : (await resolvePricingRule(group?.locationId ?? null, tuple)).rule?.validity_days

      const createdSub = await addSubscription.mutateAsync({
        studentId,
        data: {
          groupId,
          type: subType,
          sessionsTotal: isUnlimited ? undefined : total,
          isUnlimited,
          createdAt: date,
          sessionDuration,
          validityDays,
          // Наследуем слот (прайм/обычный) от предыдущего абонемента группы.
          timeSlot: slot,
        },
      })

      if (paidNow && createdSub) {
        const fin = await autoCreatePayment(
          studentId,
          { id: createdSub.id, type: subType, createdAt: date, tuple, sessionsTotal: isUnlimited ? undefined : total },
          isIndividual,
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

  const countLabel = subLabel({ total, sessionDuration, isUnlimited })
  const priceText = price !== null ? `${countLabel} · ${price} ₽` : countLabel

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
        {issueMode ? (
          <div className="renew-row">
            <span className="renew-row__label">{t('subscriptions.renew.tariffLabel')}</span>
            <Select
              value={selectedRule?.id}
              onChange={setRuleId}
              variant="borderless"
              popupMatchSelectWidth={false}
              placeholder={t('subscriptions.add.typePlaceholder')}
              notFoundContent={t('subscriptions.add.noTariffHint')}
              options={options.map((r) => ({
                value: r.id,
                label: `${subLabel({ total: r.sessions_count, sessionDuration: r.duration_minutes, isUnlimited: r.format === 'unlimited' })} · ${slot === 'prime' ? r.client_prime_price : r.client_price} ₽`,
              }))}
            />
          </div>
        ) : (
          <div className="renew-row">
            <span className="renew-row__label">{t('subscriptions.renew.asPrevLabel')}</span>
            <span className="renew-row__value">{priceText}</span>
          </div>
        )}
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
