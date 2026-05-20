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
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3020',
})
