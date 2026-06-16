import { useState } from 'react'

import { useLocation } from 'react-router-dom'

export type FinanceTab = 'records' | 'stats' | 'pricing' | 'locations'

export function useFinancePage() {
  const location = useLocation()
  const initial = (location.state as { financeTab?: FinanceTab } | null)?.financeTab ?? 'records'
  const [tab, setTab] = useState<FinanceTab>(initial)
  return { tab, setTab }
}
