import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getKPIs, getWarningStudents } from 'common/lib/kpi'
import { todayISO } from 'common/utils/date'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { buildCalendarDay, useTrainings } from 'entities/trainings'

import type { KpiType } from './kpi-detail-modal'

export function useHomePage() {
  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: getKPIs })
  const { data: warnings = [] } = useQuery({
    queryKey: ['warnings'],
    queryFn: getWarningStudents,
  })
  const { data: students = [] } = useStudents()
  const { data: trainings = [], isLoading, isError, refetch } = useTrainings()
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

  const todayStr = todayISO()
  const todayTrainings = useMemo(
    () => trainings.filter((t) => t.date === todayStr),
    [trainings, todayStr],
  )

  // Строки агенды: записанные занятия + слоты расписаний групп на сегодня,
  // отсортированы по времени (та же модель, что у календаря).
  const agendaBlocks = useMemo(
    () => buildCalendarDay(todayStr, trainings, students, groups).day.blocks,
    [todayStr, trainings, students, groups],
  )

  return {
    kpis,
    warnings,
    students,
    trainings,
    groups,
    isLoading,
    isError,
    refetch,
    indNames,
    regularNames,
    todayTrainings,
    agendaBlocks,
    kpiType,
    setKpiType,
    markTodayOpen,
    setMarkTodayOpen,
  }
}
