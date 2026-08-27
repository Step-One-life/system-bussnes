import { isAuthFailure } from '../services/google-oauth.service'

// D27: 403 приходит и при отзыве прав, и при квоте/rate-limit. Раньше любой
// 403 помечал соединение needs_reconnect — на экране висело «переподключите
// Google» при исправном токене, а очередь синхронизации вставала.
describe('isAuthFailure', () => {
  it('401 — всегда потеря доступа', () => {
    expect(isAuthFailure(401, 'Unauthorized', '')).toBe(true)
  })

  it('invalid_grant — отозванный refresh-токен', () => {
    expect(isAuthFailure(400, 'invalid_grant: token revoked', '')).toBe(true)
  })

  it('403 с insufficientPermissions — реальная потеря прав', () => {
    expect(isAuthFailure(403, 'Forbidden', 'insufficientPermissions')).toBe(true)
  })

  it('403 по квоте — обычная ошибка с бэкоффом, НЕ переподключение', () => {
    expect(isAuthFailure(403, 'Forbidden', 'quotaExceeded')).toBe(false)
    expect(isAuthFailure(403, 'Forbidden', 'rateLimitExceeded')).toBe(false)
  })

  it('403 без внятной причины (read-only календарь) не роняет соединение', () => {
    expect(isAuthFailure(403, 'Forbidden', '')).toBe(false)
  })

  it('429 и 500 — не про доступ', () => {
    expect(isAuthFailure(429, 'Too Many Requests', '')).toBe(false)
    expect(isAuthFailure(500, 'Internal', '')).toBe(false)
  })
})
