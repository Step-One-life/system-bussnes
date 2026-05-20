import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDayOfWeek } from 'common/utils/date'
import { groupKeys, useGroups } from 'entities/groups'
import {
  getStudentById,
  removeVisit,
  restoreSession,
  studentKeys,
  useStudents,
} from 'entities/students'
import {
  createTraining,
  getTrainingById,
  markAttendance,
  trainingKeys,
  updateTraining,
  useTrainings,
} from 'entities/trainings'

import type { Training } from 'entities/trainings'

interface TodayGroup {
  groupId: string
  time: string
  existing: Training | null
  originalAttendees: Set<string>
}

export function useMarkToday(open: boolean, onClose: () => void) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayDow = formatDayOfWeek(todayStr)

  // groupId → set of checked student ids
  const [checks, setChecks] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)

  const todayGroups: TodayGroup[] = useMemo(() => {
    if (!open) return []
    const result: TodayGroup[] = []
    for (const g of groups) {
      if (g.isIndividual) continue
      const entry = (g.schedule ?? []).find((s) => s.day === todayDow)
      if (!entry) continue
      const existing =
        trainings.find((t) => t.groupId === g.name && t.date === todayStr) ?? null
      result.push({
        groupId: g.name,
        time: entry.time || '',
        existing,
        originalAttendees: new Set(existing?.attendees ?? []),
      })
    }
    return result
  }, [open, groups, trainings, todayDow, todayStr])

  const initChecks = () => {
    const init: Record<string, Set<string>> = {}
    for (const tg of todayGroups) {
      init[tg.groupId] = new Set(tg.originalAttendees)
    }
    setChecks(init)
  }

  const toggle = (groupId: string, studentId: string) => {
    setChecks((prev) => {
      const next = { ...prev }
      const set = new Set(next[groupId] ?? [])
      if (set.has(studentId)) set.delete(studentId)
      else set.add(studentId)
      next[groupId] = set
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      for (const tg of todayGroups) {
        const checked = [...(checks[tg.groupId] ?? [])]
        const toAdd = checked.filter((id) => !tg.originalAttendees.has(id))
        const toRemove = [...tg.originalAttendees].filter((id) => !checked.includes(id))

        let training = tg.existing
        if (!training && checked.length > 0) {
          training = await createTraining({
            groupId: tg.groupId,
            date: todayStr,
            time: tg.time,
            attendees: [],
          })
        }
        if (!training) continue

        if (toAdd.length) await markAttendance(training, toAdd)

        for (const sid of toRemove) {
          const t = await getTrainingById(training.id)
          if (!t) continue
          const stu = await getStudentById(sid)
          if (stu?.visitHistory.some((v) => v.trainingId === training!.id)) {
            await restoreSession(sid, tg.groupId)
            await removeVisit(sid, training.id)
          }
          await updateTraining(training.id, {
            attendees: t.attendees.filter((id) => id !== sid),
          })
        }
      }
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: groupKeys.all })
      toast({ type: 'success', title: t('home.attendanceSaved') })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return { todayGroups, students, checks, toggle, initChecks, save, saving }
}
