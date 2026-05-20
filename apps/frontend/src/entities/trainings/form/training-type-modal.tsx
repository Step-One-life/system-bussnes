import { Modal } from 'antd'
import { TeamOutlined, UserOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import './training-modals.scss'

interface TrainingTypeModalProps {
  open: boolean
  onClose: () => void
  onPickGroup: () => void
  onPickIndividual: () => void
}

export function TrainingTypeModal({
  open,
  onClose,
  onPickGroup,
  onPickIndividual,
}: TrainingTypeModalProps) {
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      title={t('trainings.type.title')}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div className="training-type-grid">
        <button className="training-type-card" onClick={onPickGroup}>
          <TeamOutlined />
          <span>{t('trainings.type.group')}</span>
        </button>
        <button className="training-type-card" onClick={onPickIndividual}>
          <UserOutlined />
          <span>{t('trainings.type.individual')}</span>
        </button>
      </div>
    </Modal>
  )
}
