import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'

import type { UpdateLocationShape } from '@trikick/shared'

import { CreateLocationDto } from './create-location.dto'

export class UpdateLocationDto extends PartialType(CreateLocationDto) implements UpdateLocationShape {
  @ApiPropertyOptional({ description: 'Архивировать локацию (мягкое скрытие)' })
  @IsOptional()
  @IsBoolean()
  archived?: boolean
}
