import { useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

import { useDeleteTrainingWithRestore } from '../api/use-training-actions'

import type { Training } from '../model/types'

/**
 * Поток удаления тренировки с выбором области для серии. Для повторяющейся
 * тренировки `request` открывает диалог «только это занятие / вся серия»; для
 * одиночной — обычное подтверждение. `confirm(series)` выполняет мутацию (откат
 * биллинга — на бэке), показывает тост и зовёт `onDone`. Ошибка мутации не
 * глотается — показывается тостом.
 */
export function useTrainingDelete(onDone?: () => void) {
  const { t } = useTranslation()
  const toast = useToast()
  const del = useDeleteTrainingWithRestore()
  const [target, setTarget] = useState<Training | null>(null)

  const request = (training: Training) => setTarget(training)
  const cancel = () => setTarget(null)

  const confirm = async (series: boolean) => {
    const training = target
    setTarget(null)
    if (!training) return
    try {
      await del.mutateAsync({ training, series })
      toast({
        type: 'info',
        title: series ? t('trainings.seriesDeleted') : t('trainings.trainingDeleted'),
      })
      onDone?.()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return { target, request, cancel, confirm, deleting: del.isPending }
}
