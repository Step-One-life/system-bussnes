import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

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
  hallAmount!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateHallCostDto extends PartialType(CreateHallCostDto) {}
