export interface AppConfig {
  nodeEnv: string
  port: number
  db: {
    host: string
    port: number
    user: string
    password: string
    name: string
  }
  jwt: {
    secret: string
    expiresIn: string
  }
  corsOrigin: string
  google: {
    clientId: string
    clientSecret: string
    redirectUri: string
  }
  calendarTokenEncKey: string
  frontendUrl: string
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3021', 10),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'trikick',
    password: process.env.DB_PASSWORD ?? 'trikick',
    name: process.env.DB_NAME ?? 'trikick',
  },
  jwt: {
    // Наличие гарантирует validateEnv (IsNotEmpty) — фолбэка нет намеренно.
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3020',
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ??
      'http://localhost:3021/api/calendar/google/callback',
  },
  // Dev-фолбэк достижим только вне production: validateEnv требует ключ в проде.
  calendarTokenEncKey: process.env.CALENDAR_TOKEN_ENC_KEY ?? 'dev-insecure-key-change-me',
  frontendUrl: process.env.CORS_ORIGIN ?? 'http://localhost:3020',
})
