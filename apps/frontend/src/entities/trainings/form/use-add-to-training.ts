import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { studentKeys, useStudents } from 'entities/students/api/use-students'
import { addSubscription, createStudent } from 'entities/students/model/students.repo'
import { getDaysRemaining, getSubStatus } from 'entities/students/model/subscription-status'

import { useMarkAttendance, useUpdateTraining } from '../api/use-trainings'
import { getTrainingById } from '../model/trainings.repo'

import type { Training } from '../model/types'
import type { SubscriptionType } from 'entities/students/model/types'

export interface AddCandidate {
  id: string
  name: string
  metaLabel: string
  status: ReturnType<typeof getSubStatus>
}

interface UseAddToTrainingOptions {
  training: Training
  onDone: () => void
}

export function useAddToTraining({ training, onDone }: UseAddToTrainingOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const { data: students = [] } = useStudents()
  const updateTraining = useUpdateTraining()
  const markAttendance = useMarkAttendance()

  const [tab, setTab] = useState<'group' | 'new'>('group')
  const [selected, setSelected] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [newSubType, setNewSubType] = useState<SubscriptionType | ''>('')
  const [saving, setSaving] = useState(false)

  const candidates: AddCandidate[] = students
    .filter((s) => s.groups.includes(training.groupId) && !training.attendees.includes(s.id))
    .map((s) => {
      const sub = s.subscriptions.find((x) => x.groupId === training.groupId && x.isActive) ?? null
      const days = sub ? getDaysRemaining(sub) : null
      const metaLabel = sub
        ? `${sub.remaining}/${sub.total} зан.${
            days !== null ? ` · ${days < 0 ? 'срок истёк' : `${days} дн.`}` : ''
          }`
        : 'нет абонемента'
      return { id: s.id, name: s.name, metaLabel, status: getSubStatus(s, training.groupId) }
    })

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async () => {
    setSaving(true)
    try {
      if (tab === 'group') {
        if (!selected.length) {
          toast({ type: 'warn', title: t('trainings.addTo.pickAtLeastOne') })
          return
        }
        const fresh = await getTrainingById(training.id)
        if (!fresh) return
        const attendees = [...new Set([...fresh.attendees, ...selected])]
        await updateTraining.mutateAsync({ id: training.id, changes: { attendees } })
        const results = await markAttendance.mutateAsync({
          training: fresh,
          studentIds: selected,
        })

        toast({
          type: 'success',
          title: t('trainings.addTo.added'),
          msg: t('trainings.addTo.addedMsg', { count: selected.length }),
        })
        for (const r of results) {
          if (r.status === 'expired') {
            toast({ type: 'error', title: r.name, msg: t('trainings.addTo.subExpired') })
          } else if (r.status === 'ending') {
            toast({
              type: 'warn',
              title: r.name,
              msg: t('trainings.addTo.remaining', { count: r.sub?.remaining }),
            })
          } else if (r.status === 'none') {
            toast({ type: 'warn', title: r.name, msg: t('trainings.addTo.noActiveSub') })
          }
        }
      } else {
        const name = newName.trim()
        if (!name) {
          toast({ type: 'error', title: t('trainings.addTo.nameRequired') })
          return
        }
        const student = await createStudent({ name, groups: [training.groupId] })

        if (newSubType) {
          await addSubscription(student.id, {
            groupId: training.groupId,
            type: newSubType,
            createdAt: training.date,
          })
        }

        const fresh = await getTrainingById(training.id)
        if (!fresh) return
        // Adding the student as an attendee deducts a session (if any) and
        // records the visit server-side, for both the sub and no-sub cases.
        const results = await markAttendance.mutateAsync({
          training: fresh,
          studentIds: [student.id],
        })
        if (newSubType) {
          for (const r of results) {
            if (r.status === 'ending') {
              toast({
                type: 'warn',
                title: r.name,
                msg: t('trainings.addTo.remaining', { count: r.sub?.remaining }),
              })
            }
          }
        }

        toast({
          type: 'success',
          title: t('trainings.addTo.studentAdded'),
          msg: t('trainings.addTo.studentAddedMsg', { name }),
        })
      }

      qc.invalidateQueries({ queryKey: studentKeys.all })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  return {
    tab,
    setTab,
    candidates,
    selected,
    toggle,
    newName,
    setNewName,
    newSubType,
    setNewSubType,
    saving,
    submit,
  }
}
