import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useCreateGroup, useUpdateGroup } from '../api/use-groups'
import { daysWithoutTime } from './schedule-time'

import type { Group, ScheduleEntry } from '../model/types'

interface UseGroupFormOptions {
  group: Group | null
  onDone: () => void
}

export function useGroupForm({ group, onDone }: UseGroupFormOptions) {
  const { t } = useTranslation()
  const isEdit = !!group
  const toast = useToast()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()

  // Стейт инициализируется из переданной группы. Чтобы при переоткрытии
  // модалки для другой группы поля показывали актуальные данные, родитель
  // должен перемонтировать GroupFormModal через изменение key.
  const [name, setName] = useState(group?.name ?? '')
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(group?.schedule ?? [])
  const [duration, setDuration] = useState(group?.duration ?? 60)
  const [locationId, setLocationId] = useState<string | null>(group?.locationId ?? null)
  // Срок годности: '' в инпуте ⇄ null в API (бессрочная группа).
  const [expiresAt, setExpiresAt] = useState<string>(group?.expiresAt ?? '')

  const saving = createGroup.isPending || updateGroup.isPending

  const submit = async () => {
    if (!isEdit && !name.trim()) {
      toast({ type: 'error', title: t('groups.nameRequired') })
      return
    }
    // День без времени сохранялся молча и не порождал занятий: в календаре и
    // ленте «Сегодня» его не было, хотя карточка показывала «Пн, Ср · 60 мин».
    const noTime = daysWithoutTime(schedule)
    if (noTime.length) {
      toast({
        type: 'error',
        title: t('groups.form.scheduleTimeRequired', { days: noTime.join(', ') }),
      })
      return
    }
    const expires = expiresAt || null
    try {
      if (isEdit) {
        await updateGroup.mutateAsync({
          id: group.id,
          changes: { schedule, duration, locationId, expiresAt: expires },
        })
        toast({ type: 'success', title: t('groups.updated'), msg: group.name })
      } else {
        await createGroup.mutateAsync({
          name: name.trim(),
          schedule,
          duration,
          locationId,
          expiresAt: expires,
        })
        toast({ type: 'success', title: t('groups.created'), msg: name.trim() })
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    isEdit,
    name,
    setName,
    schedule,
    setSchedule,
    duration,
    setDuration,
    locationId,
    setLocationId,
    expiresAt,
    setExpiresAt,
    saving,
    submit,
  }
}
