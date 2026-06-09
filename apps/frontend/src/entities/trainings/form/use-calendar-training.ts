import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useGroups } from 'entities/groups/api/use-groups'
import { studentKeys, useStudents } from 'entities/students/api/use-students'
import { getSubStatus, subTypeLabel } from 'entities/students/model/subscription-status'

import { useDeleteTrainingWithRestore } from '../api/use-training-actions'
import { useTrainings } from '../api/use-trainings'
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

function buildSubLine(student: Student, groupId: string): string {
  const sub = student.subscriptions.find((s) => s.groupId === groupId && s.isActive) ?? null
  if (!sub) return ''
  const isSingle = sub.type === '1' || sub.type === '1_90'
  return isSingle
    ? subTypeLabel(sub.type)
    : `${subTypeLabel(sub.type)} · осталось ${sub.remaining}`
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
  const deleteTraining = useDeleteTrainingWithRestore()

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

  const groupRows: AttendRow[] = groupStudents.map((s) => ({
    studentId: s.id,
    name: s.name,
    subLine: buildSubLine(s, block.groupId),
    status: getSubStatus(s, block.groupId),
  }))

  const indRows: AttendRow[] = (training?.attendees ?? []).map((id) => {
    const s = students.find((st) => st.id === id)
    return {
      studentId: id,
      name: s?.name ?? t('trainings.item.deleted'),
      subLine: s ? buildSubLine(s, block.groupId) : '',
      status: s ? getSubStatus(s, block.groupId) : { label: '—', type: 'none' },
    }
  })

  const clientName = isInd
    ? (students.find((s) => s.id === training?.attendees[0])?.name ?? null)
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

  const removeAttendee = async (studentId: string) => {
    if (!training) return
    try {
      await removeAttendeeApi(training.id, studentId)
      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['trainings', 'all'] })
      toast({ type: 'info', title: t('trainings.cal.studentRemoved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
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
        const results = await markAttendance(current, toAdd)
        const noTariff = results.filter((r) => r.billing === 'none').map((r) => r.name)
        if (noTariff.length) {
          toast({
            type: 'warn',
            title: t('finance.autoRecord.noTariff'),
            msg: noTariff.join(', '),
          })
        }
      }

      const toRemove = groupRows
        .map((r) => r.studentId)
        .filter((id) => !checked.has(id) && attendeeSet.has(id))
      for (const sid of toRemove) {
        await removeAttendeeApi(current.id, sid)
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      qc.invalidateQueries({ queryKey: ['trainings', 'all'] })
      toast({ type: 'success', title: t('trainings.cal.attendanceSaved') })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!training) return
    await deleteTraining.mutateAsync({ training, series: false })
    toast({ type: 'info', title: t('trainings.cal.recordDeleted') })
    onDone()
  }

  return {
    training,
    isInd,
    title,
    groupRows,
    indRows,
    checked,
    toggle,
    removeAttendee,
    saveAttendance,
    handleDelete,
    saving,
  }
}
