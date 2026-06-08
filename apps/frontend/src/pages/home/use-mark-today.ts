import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDayOfWeek, todayISO } from 'common/utils/date'
import { groupKeys, useGroups } from 'entities/groups'
import {
  studentKeys,
  useStudents,
} from 'entities/students'
import {
  createTraining,
  markAttendanceWithPayment,
  removeAttendee,
  trainingKeys,
  useTrainings,
} from 'entities/trainings'

import type { Training } from 'entities/trainings'

interface TodayGroup {
  groupId: string
  time: string
  duration: number
  existing: Training | null
  originalAttendees: Set<string>
}

interface TodayIndividual {
  trainingId: string
  studentId: string
  time: string
  groupId: string
  originalPresent: boolean
}

export function useMarkToday(open: boolean, onClose: () => void) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const todayStr = todayISO()
  const todayDow = formatDayOfWeek(todayStr)

  // groupId → set of checked student ids (regular groups)
  const [checks, setChecks] = useState<Record<string, Set<string>>>({})
  // trainingId → present flag (individual sessions)
  const [indChecks, setIndChecks] = useState<Record<string, boolean>>({})
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
        duration: g.duration ?? 60,
        existing,
        originalAttendees: new Set(existing?.attendees ?? []),
      })
    }
    return result
  }, [open, groups, trainings, todayDow, todayStr])

  const todayIndividuals: TodayIndividual[] = useMemo(() => {
    if (!open) return []
    const result: TodayIndividual[] = []
    for (const g of groups) {
      if (!g.isIndividual) continue
      const todayTrs = trainings.filter((t) => t.groupId === g.name && t.date === todayStr)
      for (const tr of todayTrs) {
        if (tr.attendees.length) {
          for (const sid of tr.attendees) {
            result.push({
              trainingId: tr.id,
              studentId: sid,
              time: tr.time ?? '',
              groupId: g.name,
              originalPresent: true,
            })
          }
        } else if (tr.plannedStudentId) {
          // Запланированное занятие серии: показываем неотмеченным. Галочка →
          // markAttendance спишет занятие. Не пришёл — не отмечаешь, не списано.
          result.push({
            trainingId: tr.id,
            studentId: tr.plannedStudentId,
            time: tr.time ?? '',
            groupId: g.name,
            originalPresent: false,
          })
        }
      }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time))
  }, [open, groups, trainings, todayStr])

  const initChecks = () => {
    const init: Record<string, Set<string>> = {}
    for (const tg of todayGroups) {
      init[tg.groupId] = new Set(tg.originalAttendees)
    }
    setChecks(init)

    const initInd: Record<string, boolean> = {}
    for (const ti of todayIndividuals) {
      initInd[ti.trainingId] = ti.originalPresent
    }
    setIndChecks(initInd)
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

  const toggleInd = (trainingId: string) => {
    setIndChecks((prev) => ({ ...prev, [trainingId]: !prev[trainingId] }))
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
            sessionDuration: tg.duration,
          })
        }
        if (!training) continue

        if (toAdd.length) await markAttendanceWithPayment(training, toAdd)

        for (const sid of toRemove) {
          await removeAttendee(training.id, sid)
        }
      }

      for (const ti of todayIndividuals) {
        const isChecked = indChecks[ti.trainingId] ?? ti.originalPresent
        if (!isChecked && ti.originalPresent) {
          await removeAttendee(ti.trainingId, ti.studentId)
        } else if (isChecked && !ti.originalPresent) {
          const tr = trainings.find((t) => t.id === ti.trainingId)
          if (tr) await markAttendanceWithPayment(tr, [ti.studentId])
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

  return { todayGroups, todayIndividuals, students, checks, indChecks, toggle, toggleInd, initChecks, save, saving }
}
