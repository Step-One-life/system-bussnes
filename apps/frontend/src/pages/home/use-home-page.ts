import { useMemo, useState } from 'react'

import { computeKPIs, computeWarnings } from 'common/lib/kpi'
import { todayISO, yesterdayISO } from 'common/utils/date'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { buildCalendarDay, useTrainings } from 'entities/trainings'

import type { KpiType } from './kpi-detail-modal'

export function useHomePage() {
  const { data: students = [], isLoading: studentsLoading } = useStudents()
  const { data: trainings = [], isLoading, isError, refetch } = useTrainings()
  const { data: groups = [] } = useGroups()

  // KPI и «Требует внимания» — чистые производные от кэшей students/trainings:
  // любая инвалидация studentKeys/trainingKeys (продление, отметка, откат)
  // обновляет их автоматически. Раньше это были отдельные query-ключи
  // ['kpis']/['warnings'] без единой инвалидации (плашки «залипали») и с
  // собственными повторными запросами /students и /trainings.
  const kpis = useMemo(
    () =>
      studentsLoading || isLoading
        ? undefined
        : computeKPIs(students, trainings, new Date()),
    [studentsLoading, isLoading, students, trainings],
  )
  const warnings = useMemo(() => computeWarnings(students), [students])

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

  // Сигнал «вчера не отмечено»: занятия вчерашнего дня с нулём отметок.
  const yest = yesterdayISO()
  const yesterdayUnmarked = useMemo(
    () =>
      buildCalendarDay(yest, trainings, students, groups).day.blocks.filter(
        (b) => b.attendeesCount === 0,
      ).length,
    [yest, trainings, students, groups],
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
    yesterdayUnmarked,
    kpiType,
    setKpiType,
    markTodayOpen,
    setMarkTodayOpen,
  }
}
