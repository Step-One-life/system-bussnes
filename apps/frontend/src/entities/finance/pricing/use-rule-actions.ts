import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useCreatePricingRule, useDeletePricingRule } from '../api/use-finance'
import { buildDuplicatePayload } from './pricing-utils'

import type { PricingRule } from '../model/types'

/** Состояние модалки + обработчики действий над тарифами. */
export function useRuleActions(locationId: string) {
  const { t } = useTranslation()
  const toast = useToast()
  const deleteRule = useDeletePricingRule()
  const createRule = useCreatePricingRule()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PricingRule | null>(null)

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (rule: PricingRule) => {
    setEditing(rule)
    setModalOpen(true)
  }
  const close = () => setModalOpen(false)

  const remove = async (rule: PricingRule) => {
    try {
      await deleteRule.mutateAsync({ id: rule.id, locationId })
      toast({ type: 'success', title: t('finance.pricing.ruleDeleted') })
      setModalOpen(false)
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  // Дублирование: создаём новый тариф с теми же полями и пометкой «(копия)».
  const duplicate = async (rule: PricingRule) => {
    try {
      const payload = buildDuplicatePayload(rule, t('finance.pricing.duplicateSuffix'))
      await createRule.mutateAsync(payload)
      toast({ type: 'success', title: t('finance.pricing.ruleDuplicated') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return { modalOpen, editing, openCreate, openEdit, close, remove, duplicate }
}
