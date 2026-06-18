import { Button, Modal } from 'antd'

import { useTranslation } from 'react-i18next'

import type { Training } from '../model/types'

interface DeleteTrainingModalProps {
  /** Удаляемая тренировка; `null` — модалка закрыта. */
  training: Training | null
  deleting: boolean
  /** series=true — удалить всю серию, false — только это занятие. */
  onConfirm: (series: boolean) => void
  onCancel: () => void
}

/**
 * Подтверждение удаления тренировки. Для повторяющейся серии предлагает выбор:
 * «Только это занятие» / «Всю серию». Для одиночной — обычное подтверждение.
 */
export function DeleteTrainingModal({
  training,
  deleting,
  onConfirm,
  onCancel,
}: DeleteTrainingModalProps) {
  const { t } = useTranslation()
  const isSeries = !!training?.recurring && !!training?.recurringId

  const footer = isSeries
    ? [
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="single" loading={deleting} onClick={() => onConfirm(false)}>
          {t('trainings.delete.scopeSingle')}
        </Button>,
        <Button key="series" danger loading={deleting} onClick={() => onConfirm(true)}>
          {t('trainings.delete.scopeSeries')}
        </Button>,
      ]
    : [
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="del" danger loading={deleting} onClick={() => onConfirm(false)}>
          {t('common.delete')}
        </Button>,
      ]

  return (
    <Modal
      open={!!training}
      title={t('trainings.delete.title')}
      footer={footer}
      onCancel={onCancel}
      destroyOnHidden
    >
      {isSeries ? t('trainings.delete.seriesBody') : t('trainings.delete.singleBody')}
    </Modal>
  )
}
