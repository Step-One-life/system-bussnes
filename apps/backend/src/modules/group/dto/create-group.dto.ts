import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator'

import type { CreateGroupShape } from '@trikick/shared'

import { ScheduleEntryDto } from './schedule-entry.dto'

export class CreateGroupDto implements CreateGroupShape {
  @ApiProperty({ example: 'Трикинг' })
  @IsString()
  @IsNotEmpty()
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
}
