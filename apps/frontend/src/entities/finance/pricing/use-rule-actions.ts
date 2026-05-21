import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useDeletePricingRule } from '../api/use-finance'

import type { PricingRule } from '../model/types'

/** Modal state + delete handler for the pricing rules screen. */
export function useRuleActions(locationId: string) {
  const { t } = useTranslation()
  const toast = useToast()
  const deleteRule = useDeletePricingRule()

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

  return { modalOpen, editing, openCreate, openEdit, close, remove }
}
