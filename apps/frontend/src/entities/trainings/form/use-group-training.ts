import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'
import { useStudents } from 'entities/students/api/use-students'

import { useCreateTraining, useMarkAttendance } from '../api/use-trainings'
import { checkTrainingConflict, isPrimeTime } from '../model/training-logic'

function today(): string {
  return todayISO()
}

interface UseGroupTrainingOptions {
  onDone: () => void
}

export function useGroupTraining({ onDone }: UseGroupTrainingOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: students = [] } = useStudents()
  const createTraining = useCreateTraining()
  const markAttendance = useMarkAttendance()
  const { data: locations = [] } = useLocations()

  const [groupId, setGroupId] = useState('')
  const [date, setDate] = useState(today())
  const [time, setTime] = useState('18:00')
  const [note, setNote] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [locationId, setLocationId] = useState<string | null>(null)
  // Tracks an explicit location override so picking a group does not clobber it.
  const [locationTouched, setLocationTouched] = useState(false)

  const regularGroups = groups.filter((g) => !g.isIndividual)
  const selectedGroup = regularGroups.find((g) => g.name === groupId) ?? null

  const handleSetGroupId = (id: string) => {
    setGroupId(id)
    if (!locationTouched) {
      const group = groups.find((g) => g.name === id)
      setLocationId(group?.locationId ?? null)
    }
  }
  const handleSetLocationId = (id: string | null) => {
    setLocationTouched(true)
    setLocationId(id)
  }
  const groupStudents = groupId
    ? students.filter((s) => s.groups.includes(groupId))
    : []

  const { data: conflicts = [] } = useQuery({
    queryKey: ['training-conflict', groupId, date, time],
    queryFn: () => checkTrainingConflict(date, time, groupId),
    enabled: !!date && !!time && !!groupId,
  })

  const toggleAttendee = (id: string) => {
    setAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const saving = createTraining.isPending || markAttendance.isPending

  const submit = async () => {
    if (!groupId || !date) {
      toast({ type: 'error', title: t('trainings.group.fillGroupAndDate') })
      return
    }
    const live = await checkTrainingConflict(date, time, groupId)
    if (live.length) {
      const detail = live.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
      toast({ type: 'error', title: t('trainings.group.scheduleConflict'), msg: detail })
      return
    }
    try {
      const effectiveLocation = locations.find((l) => l.id === locationId) ?? null
      const training = await createTraining.mutateAsync({
        date,
        time,
        groupId,
        locationId,
        attendees: [],
        note: note.trim(),
        isPrime: isPrimeTime(date, time, effectiveLocation),
        sessionDuration: selectedGroup?.duration ?? 60,
      })
      const results = await markAttendance.mutateAsync({ training, studentIds: attendees })

      toast({
        type: 'success',
        title: t('trainings.group.recorded'),
        msg: t('trainings.group.recordedMsg', { group: groupId, count: attendees.length }),
      })

      for (const r of results) {
        if (r.status === 'expired') {
          toast({ type: 'error', title: r.name, msg: t('trainings.addTo.subExpired') })
        } else if (r.status === 'ending') {
          toast({
            type: 'warn',
            title: r.name,
            msg: t('trainings.addTo.remaining', { count: r.remaining ?? 0 }),
          })
        } else if (r.billing === 'none') {
          toast({ type: 'warn', title: r.name, msg: t('finance.autoRecord.noTariff') })
        }
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    regularGroups,
    groupStudents,
    groupId,
    setGroupId: handleSetGroupId,
    date,
    setDate,
    time,
    setTime,
    note,
    setNote,
    attendees,
    toggleAttendee,
    locationId,
    setLocationId: handleSetLocationId,
    conflicts,
    saving,
    submit,
  }
}
