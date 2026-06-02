import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'

import type { CreateTrainingShape } from '@trikick/shared'

export class CreateTrainingDto implements CreateTrainingShape {
  @ApiProperty({ description: 'Дата YYYY-MM-DD' })
  @IsString()
  date!: string

  @ApiPropertyOptional({ description: 'Время HH:mm' })
  @IsOptional()
  @IsString()
  time?: string

  @ApiProperty({ description: 'id группы', format: 'uuid' })
  @IsUUID()
  groupId!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'id локации' })
  @IsOptional()
  @IsUUID()
  locationId?: string | null

  @ApiPropertyOptional({ type: [String], description: 'id учеников' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attendees?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrime?: boolean

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  sessionDuration?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  recurringId?: string | null

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Запланированный клиент (без списания)' })
  @IsOptional()
  @IsUUID()
  plannedStudentId?: string | null
}
