import { backfillCutoff, syncTaskAction } from './sync-decision'

describe('syncTaskAction', () => {
  it('skip: подключения нет', () => {
    expect(syncTaskAction(null, true, true)).toBe('skip')
  })

  it('skip: отключено пользователем', () => {
    expect(syncTaskAction('disconnected', true, true)).toBe('skip')
  })

  it('skip: нет календаря (настройка не завершена)', () => {
    expect(syncTaskAction('connected', false, true)).toBe('skip')
  })

  it('defer: нужно переподключение — задачу НЕ теряем', () => {
    expect(syncTaskAction('needs_reconnect', true, true)).toBe('defer')
  })

  it('defer: статус connected, но токен временно недоступен', () => {
    expect(syncTaskAction('connected', true, false)).toBe('defer')
  })

  it('sync: всё на месте', () => {
    expect(syncTaskAction('connected', true, true)).toBe('sync')
  })
})

describe('backfillCutoff', () => {
  it('вычитает lookback-дни от сегодняшней даты', () => {
    expect(backfillCutoff('2026-06-29', 90)).toBe('2026-03-31')
  })

  it('lookback 0 — это сегодня (только будущее + сегодня)', () => {
    expect(backfillCutoff('2026-06-29', 0)).toBe('2026-06-29')
  })

  it('корректно переходит через границу года', () => {
    expect(backfillCutoff('2026-01-10', 30)).toBe('2025-12-11')
  })
})
