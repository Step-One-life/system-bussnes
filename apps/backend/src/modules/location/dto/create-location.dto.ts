import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import type { CreateLocationShape, LocationKind } from '@trikick/shared'

const LOCATION_KINDS: LocationKind[] = ['hall', 'studio', 'outdoor', 'online']

export class CreateLocationDto implements CreateLocationShape {
  @ApiProperty({ example: 'Основной зал' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ example: 'ул. Спортивная, 1' })
  @IsOptional()
  @IsString()
  address?: string | null

  @ApiPropertyOptional({ enum: LOCATION_KINDS, default: 'hall' })
  @IsOptional()
  @IsIn(LOCATION_KINDS)
  kind?: LocationKind

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @ApiPropertyOptional({ example: '17:00', description: 'Начало прайм-тайм в будни (HH:mm)' })
  @IsOptional()
  @IsString()
  primeWeekdayStart?: string | null

  @ApiPropertyOptional({ example: '20:00', description: 'Конец прайм-тайм в будни (HH:mm)' })
  @IsOptional()
  @IsString()
  primeWeekdayEnd?: string | null

  @ApiPropertyOptional({ example: '10:00', description: 'Начало прайм-тайм в выходные (HH:mm)' })
  @IsOptional()
  @IsString()
  primeWeekendStart?: string | null

  @ApiPropertyOptional({ example: '20:00', description: 'Конец прайм-тайм в выходные (HH:mm)' })
  @IsOptional()
  @IsString()
  primeWeekendEnd?: string | null
}
