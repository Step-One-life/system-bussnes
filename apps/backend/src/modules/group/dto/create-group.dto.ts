import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator'

import { IsIsoDate } from '../../../common/decorators/date-format.decorators'

import type { CreateGroupShape } from '@trikick/shared'

import { ScheduleEntryDto } from './schedule-entry.dto'

export class CreateGroupDto implements CreateGroupShape {
  @ApiProperty({ example: 'Трикинг' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiPropertyOptional({ type: [ScheduleEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  schedule?: ScheduleEntryDto[]

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  duration?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isIndividual?: boolean

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'id локации группы' })
  @IsOptional()
  @IsUUID()
  locationId?: string | null

  @ApiPropertyOptional({
    format: 'date',
    nullable: true,
    description: 'Срок годности (YYYY-MM-DD, вкл.). Пусто/null — бессрочная.',
  })
  @IsOptional()
  @IsIsoDate()
  expiresAt?: string | null
}
