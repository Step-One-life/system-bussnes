import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { PRICING_DEFAULTS } from 'entities/finance/model/finance-constants'

import { usePricing, useSavePricing } from '../api/use-finance'

import type { Pricing } from '../model/types'

function toValues(pricing: Pricing | undefined): Record<string, number> {
  const next: Record<string, number> = { ...PRICING_DEFAULTS }
  if (pricing) {
    for (const key of Object.keys(next)) next[key] = pricing[key] ?? 0
  }
  return next
}

export function usePricingForm() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: pricing, isLoading } = usePricing()
  const savePricing = useSavePricing()

  const [values, setValues] = useState<Record<string, number>>(() => toValues(pricing))
  const [syncedFrom, setSyncedFrom] = useState(pricing)

  if (pricing !== syncedFrom) {
    setSyncedFrom(pricing)
    setValues(toValues(pricing))
  }

  const setValue = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async () => {
    try {
      await savePricing.mutateAsync(values as Pricing)
      toast({
        type: 'success',
        title: t('finance.pricing.saved'),
        msg: t('finance.pricing.savedMsg'),
      })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return { values, setValue, submit, isLoading, saving: savePricing.isPending }
}
