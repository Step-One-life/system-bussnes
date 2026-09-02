import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator'

import { IsIsoDate } from '../../../common/decorators/date-format.decorators'

import type { CreateHallCostShape, HallPaymentType, TimeSlot } from '@trikick/shared'

const HALL_TYPES: HallPaymentType[] = [
  'single_individual',
  'single_group',
  'individual_sub_4',
  'group_sub_4',
  'individual_sub_8',
  'group_sub_8',
  'single_individual_90',
  'individual_sub_4_90',
  'individual_sub_8_90',
  'single_pair',
  'single_pair_90',
  'group_subscription',
  'individual_subscription',
  'pair_subscription',
  'unlimited_subscription',
]

const TIME_SLOTS: TimeSlot[] = ['regular', 'prime']

export class CreateHallCostDto implements CreateHallCostShape {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  locationId?: string | null

  @ApiProperty({ enum: HALL_TYPES })
  @IsIn(HALL_TYPES)
  hallPaymentType!: HallPaymentType

  @ApiPropertyOptional({ enum: TIME_SLOTS, default: 'regular' })
  @IsOptional()
  @IsIn(TIME_SLOTS)
  timeSlot?: TimeSlot

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trainingTime?: string

  @ApiProperty()
  @IsNumber()
  @Min(0)
  hallAmount!: number

  @ApiPropertyOptional({ description: 'Число занятий (обобщённый абонемент). Иначе — по типу.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionsTotal?: number

  @ApiPropertyOptional({ description: 'Дата YYYY-MM-DD' })
  @IsOptional()
  @IsIsoDate()
  paidAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}

export class UpdateHallCostDto extends PartialType(CreateHallCostDto) {}
