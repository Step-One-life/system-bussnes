import { useEffect, useState } from 'react'

import { Alert, Button, Card, List, Select, Space, Tag, Typography } from 'antd'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet, useToast } from 'common/ui'
import {
  type CalendarConnectionState,
  type CalendarOption,
  calendarRepo,
} from 'entities/calendar/calendar.repo'
import { buildTimeZoneOptions } from 'entities/calendar/timezones'

export function GoogleCalendarCard() {
  const { t } = useTranslation()
  const toast = useToast()
  const [state, setState] = useState<CalendarConnectionState | null>(null)
  const [picker, setPicker] = useState<CalendarOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const refresh = () => calendarRepo.getStatus().then(setState).catch(() => undefined)
  const fail = () => toast({ type: 'error', title: t('settings.google.requestFailed') })

  const openPicker = async () => {
    try {
      const { calendars } = await calendarRepo.listCalendars()
      setPicker(calendars)
    } catch {
      fail()
    }
  }

  useEffect(() => {
    void refresh()
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      // setPicker в колбэке промиса — не синхронно в теле эффекта
      void calendarRepo
        .listCalendars()
        .then(({ calendars }) => setPicker(calendars))
        .catch(() => fail())
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('google') === 'error') {
      toast({ type: 'error', title: t('settings.google.error') })
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connect = async () => {
    try {
      const { url } = await calendarRepo.getAuthUrl()
      window.location.href = url
    } catch {
      fail()
    }
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
      toast({ type: 'success', title: t('settings.google.selected') })
    } catch {
      fail()
    } finally {
      setBusy(false)
    }
  }

  const resync = async () => {
    setSyncing(true)
    try {
      const { backfilled } = await calendarRepo.resync()
      toast({ type: 'success', title: t('settings.google.resynced', { count: backfilled }) })
    } catch {
      fail()
    } finally {
      setSyncing(false)
    }
  }

  const changeTimeZone = async (tz: string) => {
    try {
      const { backfilled } = await calendarRepo.setTimeZone(tz)
      await refresh()
      toast({
        type: 'success',
        title: t('settings.google.timeZoneUpdated', { count: backfilled }),
      })
    } catch {
      fail()
    }
  }

  const disconnect = async () => {
    try {
      await calendarRepo.disconnect()
      await refresh()
      toast({ type: 'success', title: t('settings.google.disconnected') })
    } catch {
      fail()
    }
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
              <Button onClick={resync} loading={syncing}>
                {t('settings.google.resync')}
              </Button>
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

      <AdaptiveSheet
        open={!!picker}
        title={t('settings.google.pickerTitle')}
        onClose={() => setPicker(null)}
        footer={null}
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
      </AdaptiveSheet>
    </Card>
  )
}
