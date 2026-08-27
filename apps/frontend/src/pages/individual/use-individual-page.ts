import { useEffect, useMemo, useState } from 'react'

import { computeIndividualKPIs, computeIndividualWarnings } from 'common/lib/kpi'
import { useGroups } from 'entities/groups'
import { useStudents } from 'entities/students'
import { getLastVisitDate } from 'entities/students/model/students.repo'
import { ensureIndividualGroup, useTrainings } from 'entities/trainings'

export function useIndividualPage() {
  const { data: groups = [], isError: groupsError, refetch: refetchGroups } = useGroups()
  const { data: students = [], isError: studentsError, refetch: refetchStudents } = useStudents()
  const { data: trainings = [], isError: trainingsError, refetch: refetchTrainings } = useTrainings()

  const [indGroupId, setIndGroupId] = useState('')
  const [sessionOpen, setSessionOpen] = useState(false)
  const [onlineSessionOpen, setOnlineSessionOpen] = useState(false)

  // Сбой создания контейнера раньше уходил в unhandled rejection: три CTA
  // экрана оставались серыми навсегда, а «Повторить» их не оживляло.
  const [indGroupError, setIndGroupError] = useState(false)
  useEffect(() => {
    let alive = true
    ensureIndividualGroup().then(
      (g) => alive && setIndGroupId(g.name),
      () => alive && setIndGroupError(true),
    )
    return () => {
      alive = false
    }
  }, [])

  const indGroupNames = useMemo(
    () => groups.filter((g) => g.isIndividual).map((g) => g.name),
    [groups],
  )

  // Считаем из общих кэшей: любая инвалидация studentKeys/trainingKeys
  // (запись занятия прямо с этого экрана) сразу обновляет плитки и блок
  // предупреждений. Раньше они жили на собственных ключах, которые никто не
  // инвалидировал, и качали /students дополнительно.
  const kpis = useMemo(
    () => computeIndividualKPIs(students, trainings, indGroupNames, new Date()),
    [students, trainings, indGroupNames],
  )
  const warnings = useMemo(
    () => computeIndividualWarnings(students, indGroupNames),
    [students, indGroupNames],
  )

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

  const isError = groupsError || studentsError || trainingsError || indGroupError
  const refetch = () => {
    setIndGroupError(false)
    ensureIndividualGroup().then(
      (g) => setIndGroupId(g.name),
      () => setIndGroupError(true),
    )
    refetchGroups()
    refetchStudents()
    refetchTrainings()
  }

  return {
    indGroupId,
    indGroupNames,
    kpis,
    warnings,
    clients,
    recentSessions,
    students,
    groups,
    isError,
    refetch,
    sessionOpen,
    setSessionOpen,
    onlineSessionOpen,
    setOnlineSessionOpen,
  }
}
