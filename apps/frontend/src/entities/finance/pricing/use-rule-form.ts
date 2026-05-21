import { useState } from 'react'

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

  const [title, setTitle] = useState(rule?.title ?? '')
  const [lessonKind, setLessonKind] = useState<LessonKind>(rule?.lesson_kind ?? 'individual')
  const [format, setFormat] = useState<PricingFormat>(rule?.format ?? 'subscription')
  const [duration, setDuration] = useState(rule?.duration_minutes ?? 60)
  const [sessions, setSessions] = useState(rule?.sessions_count ?? 4)
  const [clientPrice, setClientPrice] = useState(rule?.client_price ?? 0)
  const [clientPrimePrice, setClientPrimePrice] = useState(rule?.client_prime_price ?? 0)
  const [hallCost, setHallCost] = useState(rule?.hall_cost ?? 0)
  const [hallPrimeCost, setHallPrimeCost] = useState(rule?.hall_prime_cost ?? 0)

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
    }
    try {
      if (isEdit) {
        await updateRule.mutateAsync({ id: rule.id, changes: payload })
      } else {
        await createRule.mutateAsync({ location_id: locationId, ...payload })
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
    saving,
    submit,
  }
}
