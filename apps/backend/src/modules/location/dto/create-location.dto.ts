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
}
