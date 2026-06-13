import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { formatDayOfWeek } from 'common/utils/date'
import { groupKeys, useGroups } from 'entities/groups'
import { getSubStatus, studentKeys, useStudents } from 'entities/students'
import {
  createTraining,
  markAttendance,
  removeAttendee,
  trainingKeys,
  useTrainings,
} from 'entities/trainings'

import { defaultGroupChecks, defaultIndChecks, indKey } from './day-marking-model'

import type { Training } from 'entities/trainings'

export { indKey }

export interface DayGroup {
  groupId: string
  time: string
  duration: number
  existing: Training | null
  originalAttendees: Set<string>
}

export interface DayIndividual {
  trainingId: string
  studentId: string
  time: string
  groupId: string
  originalPresent: boolean
}

/** Явный выбор для save — у «Закрыть день» источник истины свой (галочки занятий). */
export interface MarkSelection {
  groups: Record<string, Set<string>>
  ind: Record<string, boolean>
}

/** Отметить без активного абонемента нельзя — тап ведёт в оформление. */
export const needsSub = (type: string) => type === 'none' || type === 'expired'

export function useDayMarking(open: boolean, onClose: () => void, dateStr: string) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const dow = formatDayOfWeek(dateStr)

  const [checks, setChecks] = useState<Record<string, Set<string>>>({})
  const [indChecks, setIndChecks] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const dayGroups: DayGroup[] = useMemo(() => {
    if (!open) return []
    const result: DayGroup[] = []
    for (const g of groups) {
      if (g.isIndividual) continue
      const entry = (g.schedule ?? []).find((s) => s.day === dow)
      if (!entry) continue
      const existing =
        trainings.find((t) => t.groupId === g.name && t.date === dateStr) ?? null
      result.push({
        groupId: g.name,
        time: entry.time || '',
        duration: g.duration ?? 60,
        existing,
        originalAttendees: new Set(existing?.attendees ?? []),
      })
    }
    return result
  }, [open, groups, trainings, dow, dateStr])

  const dayIndividuals: DayIndividual[] = useMemo(() => {
    if (!open) return []
    const result: DayIndividual[] = []
    for (const g of groups) {
      if (!g.isIndividual) continue
      const dayTrs = trainings.filter((t) => t.groupId === g.name && t.date === dateStr)
      for (const tr of dayTrs) {
        // Отмеченные ∪ плановые: наполовину отмеченное парное показывает обоих,
        // плановый виден даже когда на занятии уже есть другие attendees.
        const planned = [tr.plannedStudentId, tr.plannedStudentId2].filter(
          (sid): sid is string => !!sid,
        )
        const ids = [...new Set([...tr.attendees, ...planned])]
        for (const sid of ids) {
          result.push({
            trainingId: tr.id,
            studentId: sid,
            time: tr.time ?? '',
            groupId: g.name,
            originalPresent: tr.attendees.includes(sid),
          })
        }
      }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time))
  }, [open, groups, trainings, dateStr])

  // Дефолт «все пришли»: неотмеченные занятия предотмечены составом/плановыми,
  // кроме гейтнутых (нет активного абонемента); отмеченные — фактом.
  const initChecks = () => {
    const init: Record<string, Set<string>> = {}
    for (const dg of dayGroups) {
      const members = students.filter((s) => s.groups.includes(dg.groupId))
      init[dg.groupId] = defaultGroupChecks(
        { existing: dg.existing },
        members,
        (s) => !needsSub(getSubStatus(s, dg.groupId, dg.duration).type),
      )
    }
    setChecks(init)
    setIndChecks(
      defaultIndChecks(dayIndividuals, (slot) => {
        const st = students.find((s) => s.id === slot.studentId)
        return !!st && !needsSub(getSubStatus(st, slot.groupId).type)
      }),
    )
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

  const toggleInd = (trainingId: string, studentId: string) => {
    const key = indKey(trainingId, studentId)
    setIndChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const save = async (selection?: MarkSelection) => {
    const selGroups = selection?.groups ?? checks
    const selInd = selection?.ind ?? indChecks
    setSaving(true)
    try {
      const noTariff: string[] = []
      for (const dg of dayGroups) {
        if (!(dg.groupId in selGroups)) continue
        const checked = [...(selGroups[dg.groupId] ?? [])]
        const toAdd = checked.filter((id) => !dg.originalAttendees.has(id))
        const toRemove = [...dg.originalAttendees].filter((id) => !checked.includes(id))

        let training = dg.existing
        if (!training && checked.length > 0) {
          training = await createTraining({
            groupId: dg.groupId,
            date: dateStr,
            time: dg.time,
            attendees: [],
            sessionDuration: dg.duration,
          })
        }
        if (!training) continue

        if (toAdd.length) {
          const results = await markAttendance(training, toAdd)
          noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
        }

        for (const sid of toRemove) {
          await removeAttendee(training.id, sid)
        }
      }

      for (const ti of dayIndividuals) {
        const key = indKey(ti.trainingId, ti.studentId)
        if (!(key in selInd)) continue
        const isChecked = selInd[key]
        if (!isChecked && ti.originalPresent) {
          await removeAttendee(ti.trainingId, ti.studentId)
        } else if (isChecked && !ti.originalPresent) {
          const tr = trainings.find((t) => t.id === ti.trainingId)
          if (tr) {
            const results = await markAttendance(tr, [ti.studentId])
            noTariff.push(...results.filter((r) => r.billing === 'none').map((r) => r.name))
          }
        }
      }

      if (noTariff.length) {
        toast({ type: 'warn', title: t('finance.autoRecord.noTariff'), msg: noTariff.join(', ') })
      }
      toast({ type: 'success', title: t('home.attendanceSaved') })
      onClose()
    } catch (e) {
      // Сбой посередине циклов: часть отметок уже применена — сообщаем об
      // ошибке, а кэши перечитываются в finally, чтобы UI показал факт.
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: groupKeys.all })
      setSaving(false)
    }
  }

  return { dayGroups, dayIndividuals, students, trainings, checks, indChecks, toggle, toggleInd, initChecks, save, saving }
}
