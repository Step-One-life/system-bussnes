import { plainToInstance } from 'class-transformer'
import { IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator'

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
