import { Button } from 'antd'
import { WarningOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import './error-state.scss'

interface ErrorStateProps {
  onRetry?: () => void
}

/** Ошибка загрузки данных: текст + кнопка «Повторить» (refetch react-query). */
export function ErrorState({ onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div className="error-state">
      <span className="error-state__icon">
        <WarningOutlined />
      </span>
      <div className="error-state__title">{t('common.loadError')}</div>
      {onRetry && <Button onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  )
}
