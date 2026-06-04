import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'

import { GoogleCalendarCard } from './google-calendar-card'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <Typography.Title level={3}>{t('settings.title')}</Typography.Title>
      <GoogleCalendarCard />
    </div>
  )
}
