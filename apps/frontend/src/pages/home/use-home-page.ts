import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getKPIs, getWarningStudents } from 'common/lib/kpi'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { useTrainings } from 'entities/trainings'

import type { KpiType } from './kpi-detail-modal'

export function useHomePage() {
  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: getKPIs })
  const { data: warnings = [] } = useQuery({
    queryKey: ['warnings'],
    queryFn: getWarningStudents,
  })
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()
  const { data: groups = [] } = useGroups()

  const [kpiType, setKpiType] = useState<KpiType | null>(null)
  const [markTodayOpen, setMarkTodayOpen] = useState(false)

  const indNames = useMemo(
    () => groups.filter((g) => g.isIndividual).map((g) => g.name),
    [groups],
  )
  const regularNames = useMemo(
    () => groups.filter((g) => !g.isIndividual).map((g) => g.name),
    [groups],
  )

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayTrainings = useMemo(
    () => trainings.filter((t) => t.date === todayStr),
    [trainings, todayStr],
  )

  return {
    kpis,
    warnings,
    students,
    trainings,
    groups,
    indNames,
    regularNames,
    todayTrainings,
    kpiType,
    setKpiType,
    markTodayOpen,
    setMarkTodayOpen,
  }
}
