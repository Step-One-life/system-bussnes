import { Alert, Button, Card, List, Modal, Select, Space, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  calendarRepo,
  type CalendarConnectionState,
  type CalendarOption,
} from 'entities/calendar/calendar.repo'
import { buildTimeZoneOptions } from 'entities/calendar/timezones'

export function GoogleCalendarCard() {
  const { t } = useTranslation()
  const [state, setState] = useState<CalendarConnectionState | null>(null)
  const [picker, setPicker] = useState<CalendarOption[] | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => calendarRepo.getStatus().then(setState).catch(() => undefined)

  const openPicker = async () => {
    const { calendars } = await calendarRepo.listCalendars()
    setPicker(calendars)
  }

  useEffect(() => {
    void refresh()
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      void openPicker()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('google') === 'error') {
      message.error(t('settings.google.error'))
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    const { url } = await calendarRepo.getAuthUrl()
    window.location.href = url
  }

  const choose = async (body: { calendarId?: string; create?: boolean; name?: string }) => {
    setBusy(true)
    try {
      await calendarRepo.select({
        ...body,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      setPicker(null)
      await refresh()
      message.success(t('settings.google.selected'))
    } finally {
      setBusy(false)
    }
  }

  const resync = async () => {
    const { backfilled } = await calendarRepo.resync()
    message.success(t('settings.google.resynced', { count: backfilled }))
  }

  const changeTimeZone = async (tz: string) => {
    const { backfilled } = await calendarRepo.setTimeZone(tz)
    await refresh()
    message.success(t('settings.google.timeZoneUpdated', { count: backfilled }))
  }

  const disconnect = async () => {
    await calendarRepo.disconnect()
    await refresh()
  }

  const status = state?.status ?? 'disconnected'

  return (
    <Card title={t('settings.google.title')}>
      {status === 'needs_reconnect' && (
        <Alert
          type="warning"
          showIcon
          message={t('settings.google.needsReconnect')}
          style={{ marginBottom: 12 }}
        />
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text type="secondary">{t('settings.google.hint')}</Typography.Text>

        {status === 'connected' && state?.calendarId ? (
          <>
            <Tag color="green">{t('settings.google.connectedTo', { name: state.calendarId })}</Tag>
            <Space wrap>
              <Button onClick={resync}>{t('settings.google.resync')}</Button>
              <Button onClick={openPicker}>{t('settings.google.changeCalendar')}</Button>
              <Button danger onClick={disconnect}>
                {t('settings.google.disconnect')}
              </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                {t('settings.google.timeZoneLabel')}
              </Typography.Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                value={state.calendarTimeZone ?? undefined}
                options={buildTimeZoneOptions(state.calendarTimeZone)}
                onChange={changeTimeZone}
                showSearch
                optionFilterProp="label"
              />
            </div>
          </>
        ) : status === 'connected' && !state?.calendarId ? (
          <Button type="primary" onClick={openPicker}>
            {t('settings.google.chooseCalendar')}
          </Button>
        ) : (
          <Button type="primary" onClick={connect}>
            {t('settings.google.connect')}
          </Button>
        )}
      </Space>

      <Modal
        open={!!picker}
        title={t('settings.google.pickerTitle')}
        footer={null}
        onCancel={() => setPicker(null)}
      >
        <Button
          block
          type="dashed"
          loading={busy}
          style={{ marginBottom: 12 }}
          onClick={() => choose({ create: true, name: 'TriKick' })}
        >
          ➕ {t('settings.google.createNew')}
        </Button>
        <List
          dataSource={picker ?? []}
          renderItem={(c) => (
            <List.Item
              actions={[
                <Button key="s" size="small" loading={busy} onClick={() => choose({ calendarId: c.id })}>
                  {t('settings.google.choose')}
                </Button>,
              ]}
            >
              {c.name} {c.primary && <Tag>{t('settings.google.primary')}</Tag>}
            </List.Item>
          )}
        />
      </Modal>
    </Card>
  )
}
