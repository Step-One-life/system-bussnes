import { plainToInstance } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  NotEquals,
  ValidateIf,
  validateSync,
} from 'class-validator'

class EnvVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string

  @IsNumberString()
  PORT!: string

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string

  @IsNumberString()
  DB_PORT!: string

  @IsString()
  @IsNotEmpty()
  DB_USER!: string

  @IsString()
  DB_PASSWORD!: string

  @IsString()
  @IsNotEmpty()
  DB_NAME!: string

  /**
   * Подписывает все токены доступа. Слабый или общеизвестный секрет означает,
   * что любой желающий подписывает токен с произвольным userId и через обычный
   * /api читает данные любого тренера — учеников, телефоны, все финансы.
   * Поэтому в production длина ≥ 32 символов и запрет плейсхолдеров из
   * .env.example (их видно в репозитории).
   */
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: EnvVariables) => o.NODE_ENV === 'production')
  @MinLength(32, { message: 'JWT_SECRET в production должен быть не короче 32 символов' })
  @NotEquals('change-me-in-production', { message: 'JWT_SECRET оставлен плейсхолдером из .env.example' })
  @NotEquals('secret', { message: 'JWT_SECRET оставлен плейсхолдером' })
  JWT_SECRET!: string

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string

  /** IANA-зона для «сегодня» на сервере (см. DateUtil). Пусто — Europe/Moscow. */
  @IsOptional()
  @IsString()
  APP_TZ?: string

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET?: string

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_REDIRECT_URI?: string

  // Ключ шифрования Google-токенов. В production обязателен: dev-фолбэк
  // из configuration.ts общеизвестен и делает шифрование бутафорией.
  @ValidateIf((o: EnvVariables) => o.NODE_ENV === 'production')
  @IsString()
  @IsNotEmpty()
  @MinLength(32, { message: 'CALENDAR_TOKEN_ENC_KEY должен быть не короче 32 символов' })
  @NotEquals('dev-insecure-key-change-me', { message: 'CALENDAR_TOKEN_ENC_KEY оставлен dev-фолбэком' })
  CALENDAR_TOKEN_ENC_KEY?: string
}

export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const validated = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validated, { skipMissingProperties: false })

  if (errors.length > 0) {
    throw new Error(
      `Ошибка валидации .env:\n${errors
        .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
        .join('\n')}`,
    )
  }
  return validated
}
