import { useState } from 'react'

export type FinanceTab = 'records' | 'stats' | 'pricing'

export function useFinancePage() {
  const [tab, setTab] = useState<FinanceTab>('records')
  return { tab, setTab }
}
