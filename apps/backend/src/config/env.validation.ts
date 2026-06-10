import { plainToInstance } from 'class-transformer'
import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
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

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN!: string

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string

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
