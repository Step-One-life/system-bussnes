import 'reflect-metadata'

import { validateEnv } from './env.validation'

// D7: слабый или общеизвестный JWT_SECRET = любой желающий подписывает токен
// с чужим userId и читает данные любого тренера через обычный /api.
const base = {
  PORT: '3021',
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USER: 'trikick',
  DB_PASSWORD: 'trikick',
  DB_NAME: 'trikick',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:3020',
  CALENDAR_TOKEN_ENC_KEY: 'a'.repeat(32),
}

const prod = (over: Record<string, unknown>) =>
  validateEnv({ ...base, NODE_ENV: 'production', ...over })

describe('validateEnv — секреты в production', () => {
  it('стойкий секрет проходит', () => {
    expect(() => prod({ JWT_SECRET: 'x'.repeat(48) })).not.toThrow()
  })

  it('плейсхолдер из .env.example не пропускается', () => {
    expect(() => prod({ JWT_SECRET: 'change-me-in-production' })).toThrow(/JWT_SECRET/)
  })

  it('короткий секрет не пропускается', () => {
    expect(() => prod({ JWT_SECRET: 'short-secret' })).toThrow(/JWT_SECRET/)
  })

  it('dev-фолбэк ключа шифрования календаря не пропускается', () => {
    expect(() =>
      prod({ JWT_SECRET: 'x'.repeat(48), CALENDAR_TOKEN_ENC_KEY: 'dev-insecure-key-change-me' }),
    ).toThrow(/CALENDAR_TOKEN_ENC_KEY/)
  })

  it('в разработке слабый секрет допустим — гвард только для production', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'development', JWT_SECRET: 'dev' }),
    ).not.toThrow()
  })
})
