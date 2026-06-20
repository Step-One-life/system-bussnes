import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import i18n from 'i18next'
import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { newBatchId } from 'common/utils/batch-id'
import { useGroups } from 'entities/groups/api/use-groups'
import { studentKeys, useStudents } from 'entities/students/api/use-students'
import {
  findSubForGroup,
  getSubStatus,
  subLabel,
} from 'entities/students/model/subscription-status'

import { trainingKeys, useTrainings } from '../api/use-trainings'
import { isIndividualTraining } from '../model/training-helpers'
import { markAttendance } from '../model/training-logic'
import { createTraining, removeAttendee as removeAttendeeApi } from '../model/trainings.repo'

import type { CalendarBlock } from '../calendar/calendar-model'
import type { Student, SubStatus } from 'entities/students/model/types'

export interface AttendRow {
  studentId: string
  name: string
  subLine: string
  status: SubStatus
}

function buildSubLine(student: Student, groupId: string, duration: number | null): string {
  // Тот же абонемент, что спишет бэк (свой по длительности → свой → общий).
  const sub = findSubForGroup(student, groupId, duration)
  if (!sub) return ''
  const isSingle = sub.total <= 1
  return isSingle
    ? subLabel(sub)
    : `${subLabel(sub)} · ${i18n.t('students.sub.remainingShort', { count: sub.remaining })}`
}

interface UseCalendarTrainingOptions {
  block: CalendarBlock
  onDone: () => void
}

export function useCalendarTraining({ block, onDone }: UseCalendarTrainingOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const { data: trainings = [] } = useTrainings()

  const training = block.trainingId
    ? (trainings.find((t) => t.id === block.trainingId) ?? null)
    : null

  const isInd = isIndividualTraining(block.groupId, groups)
  const attendeeSet = useMemo(
    () => new Set(training?.attendees ?? []),
    [training],
  )

  const [checked, setChecked] = useState<Set<string>>(() => new Set(training?.attendees ?? []))
  const [saving, setSaving] = useState(false)

  const groupStudents = students.filter((s) => s.groups.includes(block.groupId))

  // Длительность занятия участвует в выборе абонемента (бэк передаёт её в
  // deduct), поэтому статус/подпись считаются с ней же.
  const duration = training?.sessionDuration ?? null

  const groupRows: AttendRow[] = groupStudents.map((s) => ({
    studentId: s.id,
    name: s.name,
    subLine: buildSubLine(s, block.groupId, duration),
    status: getSubStatus(s, block.groupId, duration),
  }))

  // Отмеченные ∪ плановые: плановое занятие видно и отмечается из календаря
  // любой датой (биллинг на бэке, paid_at = дата занятия).
  const indIds = useMemo(() => {
    if (!training) return []
    const planned = [training.plannedStudentId, training.plannedStudentId2].filter(
      (id): id is string => !!id,
    )
    return [...new Set([...training.attendees, ...planned])]
  }, [training])

  const indRows: AttendRow[] = indIds.map((id) => {
    const s = students.find((st) => st.id === id)
    return {
      studentId: id,
      name: s?.name ?? t('trainings.item.deleted'),
      subLine: s ? buildSubLine(s, block.groupId, duration) : '',
      status: s ? getSubStatus(s, block.groupId, duration) : { label: '—', type: 'none' },
    }
  })

  // Имя для заголовка индив-занятия — по ученику из attendees ∪ плановый
  // (indIds). Раньше брали только attendees[0]: пока ученик не отмечен, имя
  // было пустым и заголовок падал на имя группы-контейнера «Индивидуальные».
  const clientName = isInd
    ? (students.find((s) => s.id === indIds[0])?.name ?? null)
    : null
  const pairNames = training?.isPair
    ? [training.plannedStudentId, training.plannedStudentId2]
        .map((id) => students.find((s) => s.id === id)?.name ?? '?')
        .join(' + ')
    : null
  const title = pairNames
    ? t('trainings.pair.label', { names: pairNames })
    : isInd
      ? clientName
        ? t('trainings.cal.indWith', { name: clientName })
        : block.groupId
      : block.groupId

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveAttendance = async () => {
    setSaving(true)
    try {
      let current = training
      if (!current && checked.size > 0) {
        current = await createTraining({
          groupId: block.groupId,
          date: block.date,
          time: block.time || '',
          attendees: [],
          note: '',
        })
      }
      if (!current) {
        onDone()
        return
      }

      const toAdd = [...checked].filter((id) => !attendeeSet.has(id))
      if (toAdd.length) {
        const batchId = newBatchId()
        const results = await markAttendance(current, toAdd, batchId)
        const noTariff = results.filter((r) => r.billing === 'none').map((r) => r.name)
        if (noTariff.length) {
          toast({
            type: 'warn',
            title: t('finance.autoRecord.noTariff'),
            msg: noTariff.join(', '),
          })
        }
      }

      // attendeeSet − checked: одна формула для групповых и индивидуальных
      // (checked инициализируется из attendees, плановые приходят без галочки).
      const toRemove = [...attendeeSet].filter((id) => !checked.has(id))
      for (const sid of toRemove) {
        await removeAttendeeApi(current.id, sid)
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: trainingKeys.all })
      toast({ type: 'success', title: t('trainings.cal.attendanceSaved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  return {
    training,
    isInd,
    title,
    groupRows,
    indRows,
    checked,
    toggle,
    saveAttendance,
    saving,
  }
}
