import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getIndividualKPIs, getIndividualWarnings } from 'common/lib/kpi'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { getLastVisitDate } from 'entities/students/model/students.repo'
import { ensureIndividualGroup, useTrainings } from 'entities/trainings'

export function useIndividualPage() {
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const [indGroupId, setIndGroupId] = useState('')
  const [sessionOpen, setSessionOpen] = useState(false)

  useEffect(() => {
    ensureIndividualGroup().then((g) => setIndGroupId(g.name))
  }, [])

  const indGroupNames = useMemo(
    () => groups.filter((g) => g.isIndividual).map((g) => g.name),
    [groups],
  )

  const { data: kpis } = useQuery({
    queryKey: ['individual', 'kpis', indGroupNames],
    queryFn: () => getIndividualKPIs(indGroupNames),
    enabled: indGroupNames.length > 0,
  })

  const { data: warnings = [] } = useQuery({
    queryKey: ['individual', 'warnings', indGroupNames],
    queryFn: () => getIndividualWarnings(indGroupNames),
    enabled: indGroupNames.length > 0,
  })

  const clients = useMemo(
    () =>
      students
        .filter((s) => s.groups.some((g) => indGroupNames.includes(g)))
        .map((s) => ({
          student: s,
          lastVisit: getLastVisitDate(s),
        })),
    [students, indGroupNames],
  )

  const recentSessions = useMemo(
    () => trainings.filter((t) => indGroupNames.includes(t.groupId)).slice(0, 5),
    [trainings, indGroupNames],
  )

  return {
    indGroupId,
    indGroupNames,
    kpis: kpis ?? { clients: 0, monthSessions: 0, weekSessions: 0, expiring: 0 },
    warnings,
    clients,
    recentSessions,
    students,
    groups,
    sessionOpen,
    setSessionOpen,
  }
}
