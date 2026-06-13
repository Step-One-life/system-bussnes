import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button, DatePicker, Form, Select, Switch } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { autoCreatePayment } from 'entities/finance/lib/auto-payment'
import { resolvePricingRule, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { useAddSubscription, useStudents } from '../api/use-students'
import { linkPaymentToSub } from '../model/students.repo'

import type { SubscriptionType } from '../model/types'
import type { Dayjs } from 'dayjs'

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
  const [date, setDate] = useState(todayISO())
  const [paidNow, setPaidNow] = useState(true)
  const [saving, setSaving] = useState(false)

  // Группа и имя группы для поиска prevSub
  const group = groups.find((g) => g.id === groupId) ?? null
  const groupName = group?.name ?? groupId

  // Предыдущий абонемент ученика по данной группе (вычисляется на уровне рендера)
  const prevSub = useMemo(() => {
    const subs = students.find((s) => s.id === studentId)?.subscriptions ?? []
    return (
      [...subs]
        .filter((s) => s.groupId === groupName)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null
    )
  }, [students, studentId, groupName])

  // Тип по умолчанию — как у прошлого абонемента (нормализован к '1'/'4'/'8')
  const baseType = (prevSub?.type ?? '8').replace('_90', '').replace('_pair', '') as SubscriptionType
  const [type, setType] = useState<SubscriptionType>(baseType)
  const [seededFor, setSeededFor] = useState(prevSub?.id)
  // Паттерн «adjust state during render»: если prevSub сменился — пересинхронизируем тип
  if (seededFor !== prevSub?.id) {
    setSeededFor(prevSub?.id)
    setType(baseType)
  }

  // Живая цена выбранного типа абонемента
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
      // Получаем validity_days через отдельный запрос (не из priceRule кэша — гарантия актуальности)
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
          // Продление наследует слот (прайм/обычный) от предыдущего абонемента группы
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
        msg: `${studentName} · ${groupId}`,
      })
      onCreated?.()
      onClose()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleTypeChange = (v: string) => setType(v as SubscriptionType)
  const handleDateChange = (d: Dayjs | null) =>
    setDate(d ? d.format('YYYY-MM-DD') : date)

  return (
    <AdaptiveSheet
      open={open}
      title={issueMode ? t('subscriptions.issue.title') : t('subscriptions.renew.title')}
      onClose={onClose}
      footer={
        <>
          <Button key="cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button key="save" type="primary" loading={saving} onClick={submit}>
            {issueMode ? t('subscriptions.issue.createBtn') : t('common.extend')}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--tk-text-secondary)', fontSize: '0.85rem' }}>
        {t('subscriptions.renew.student')} <strong>{studentName}</strong>
        <br />
        {t('subscriptions.renew.group')} <strong>{groupId}</strong>
      </p>
      <Form layout="vertical">
        <Form.Item label={t('subscriptions.renew.typeLabel')}>
          <Select
            value={type}
            onChange={handleTypeChange}
            options={[
              { value: '1', label: t('students.sub.single') },
              { value: '4', label: t('students.sub.sub4') },
              { value: '8', label: t('students.sub.sub8') },
            ]}
          />
        </Form.Item>
        {price !== null && (
          <div style={{ color: 'var(--tk-text-secondary)', fontSize: 'var(--tk-fs-small)', marginTop: 'calc(-1 * var(--sp-2))', marginBottom: 'var(--sp-3)' }}>
            {t('subscriptions.renew.priceLine', { label: t(`students.subTypes.${type}`, { defaultValue: type }), amount: price })}
          </div>
        )}
        <Form.Item label={t('subscriptions.renew.dateLabel')}>
          <DatePicker
            format="DD.MM.YYYY"
            style={{ width: '100%' }}
            value={dayjs(date)}
            onChange={handleDateChange}
          />
        </Form.Item>
        <Form.Item>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Switch checked={paidNow} onChange={setPaidNow} />
            <span>
              {t('subscriptions.renew.paidNow')}
              {paidNow && price !== null && (
                <span style={{ display: 'block', color: 'var(--tk-text-tertiary)', fontSize: 'var(--tk-fs-caption)' }}>
                  {t('subscriptions.renew.paidNowHint', { amount: price })}
                </span>
              )}
            </span>
          </div>
        </Form.Item>
      </Form>
    </AdaptiveSheet>
  )
}
