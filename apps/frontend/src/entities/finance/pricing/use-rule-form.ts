import { useMemo, useState } from 'react'

import includes from 'lodash/includes'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useCreatePricingRule, useUpdatePricingRule } from '../api/use-finance'
import { DURATION_PRESETS, SESSIONS_PRESETS } from './pricing-config'

import type { LessonKind, PricingFormat, PricingRule } from '../model/types'

interface UseRuleFormOptions {
  locationId: string
  rule: PricingRule | null
  onDone: () => void
}

export function useRuleForm({ locationId, rule, onDone }: UseRuleFormOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const createRule = useCreatePricingRule()
  const updateRule = useUpdatePricingRule()
  const isEdit = !!rule

  // Базовые значения формы — нужны и для инициализации useState, и для
  // вычисления «грязного» состояния, чтобы спрашивать подтверждение перед
  // потерей введённых данных.
  const initial = useMemo(
    () => ({
      title: rule?.title ?? '',
      ruleLocationId: rule?.location_id ?? locationId,
      lessonKind: (rule?.lesson_kind ?? 'individual') as LessonKind,
      format: (rule?.format ?? 'subscription') as PricingFormat,
      duration: rule?.duration_minutes ?? 60,
      sessions: rule?.sessions_count ?? 4,
      clientPrice: rule?.client_price ?? 0,
      clientPrimePrice: rule?.client_prime_price ?? 0,
      hallCost: rule?.hall_cost ?? 0,
      hallPrimeCost: rule?.hall_prime_cost ?? 0,
      validityDays: rule?.validity_days ?? 35,
    }),
    [rule, locationId],
  )

  const [title, setTitle] = useState(initial.title)
  const [ruleLocationId, setRuleLocationId] = useState(initial.ruleLocationId)
  const [lessonKind, setLessonKind] = useState<LessonKind>(initial.lessonKind)
  const [format, setFormat] = useState<PricingFormat>(initial.format)
  const [duration, setDuration] = useState(initial.duration)
  const [sessions, setSessions] = useState(initial.sessions)
  const [clientPrice, setClientPrice] = useState(initial.clientPrice)
  const [clientPrimePrice, setClientPrimePrice] = useState(initial.clientPrimePrice)
  const [hallCost, setHallCost] = useState(initial.hallCost)
  const [hallPrimeCost, setHallPrimeCost] = useState(initial.hallPrimeCost)
  const [validityDays, setValidityDays] = useState(initial.validityDays)

  // Отслеживаем «грязные» изменения, чтобы предупредить пользователя при
  // попытке закрыть форму или уйти со страницы без сохранения.
  const isDirty =
    title !== initial.title ||
    ruleLocationId !== initial.ruleLocationId ||
    lessonKind !== initial.lessonKind ||
    format !== initial.format ||
    duration !== initial.duration ||
    sessions !== initial.sessions ||
    clientPrice !== initial.clientPrice ||
    clientPrimePrice !== initial.clientPrimePrice ||
    hallCost !== initial.hallCost ||
    hallPrimeCost !== initial.hallPrimeCost ||
    validityDays !== initial.validityDays

  // Whether the current value is one of the presets — drives preset/custom UI.
  const durationIsPreset = includes(DURATION_PRESETS, duration)
  const sessionsIsPreset = includes(SESSIONS_PRESETS, sessions)

  const saving = createRule.isPending || updateRule.isPending

  const submit = async () => {
    if (!title.trim()) {
      toast({ type: 'error', title: t('finance.pricing.ruleForm.titleRequired') })
      return
    }
    const payload = {
      title: title.trim(),
      lesson_kind: lessonKind,
      format,
      duration_minutes: duration > 0 ? duration : 60,
      sessions_count: sessions > 0 ? sessions : 1,
      client_price: clientPrice || 0,
      client_prime_price: clientPrimePrice || 0,
      hall_cost: hallCost || 0,
      hall_prime_cost: hallPrimeCost || 0,
      validity_days: validityDays > 0 ? validityDays : 35,
    }
    try {
      if (isEdit) {
        await updateRule.mutateAsync({ id: rule.id, changes: payload })
      } else {
        await createRule.mutateAsync({ location_id: ruleLocationId, ...payload })
      }
      toast({ type: 'success', title: t('finance.pricing.ruleSaved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    isEdit,
    title,
    setTitle,
    ruleLocationId,
    setRuleLocationId,
    lessonKind,
    setLessonKind,
    format,
    setFormat,
    duration,
    setDuration,
    durationIsPreset,
    sessions,
    setSessions,
    sessionsIsPreset,
    clientPrice,
    setClientPrice,
    clientPrimePrice,
    setClientPrimePrice,
    hallCost,
    setHallCost,
    hallPrimeCost,
    setHallPrimeCost,
    validityDays,
    setValidityDays,
    saving,
    isDirty,
    submit,
  }
}
