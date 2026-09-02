import { DateTime } from 'luxon'

import { appTimeZone, DateUtil, DEFAULT_APP_TZ } from './date.util'

describe('appTimeZone', () => {
  const original = process.env.APP_TZ
  afterEach(() => {
    if (original === undefined) delete process.env.APP_TZ
    else process.env.APP_TZ = original
  })

  it('по умолчанию — Europe/Moscow', () => {
    delete process.env.APP_TZ
    expect(appTimeZone()).toBe(DEFAULT_APP_TZ)
  })

  it('валидная IANA-зона из APP_TZ', () => {
    process.env.APP_TZ = 'Asia/Yekaterinburg'
    expect(appTimeZone()).toBe('Asia/Yekaterinburg')
  })

  it('мусор в APP_TZ не роняет сервер — фолбэк на дефолт', () => {
    process.env.APP_TZ = 'Mars/Olympus'
    expect(appTimeZone()).toBe(DEFAULT_APP_TZ)
  })

  it('todayIso считается в зоне приложения, а не хоста', () => {
    process.env.APP_TZ = 'Pacific/Kiritimati'
    expect(DateUtil.todayIso()).toBe(DateTime.now().setZone('Pacific/Kiritimati').toISODate())
  })
})
