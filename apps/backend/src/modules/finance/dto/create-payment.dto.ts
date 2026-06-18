import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

import type { ClientPaymentType, CreatePaymentShape } from '@trikick/shared'

const CLIENT_TYPES: ClientPaymentType[] = [
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

export class CreatePaymentDto implements CreatePaymentShape {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  locationId?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  groupId?: string | null

  @ApiProperty({ enum: CLIENT_TYPES })
  @IsIn(CLIENT_TYPES)
  clientPaymentType!: ClientPaymentType

  @ApiProperty()
  @IsNumber()
  @Min(0)
  clientAmount!: number

  @ApiPropertyOptional({ description: 'Число занятий (обобщённый абонемент). Иначе — по типу.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionsTotal?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paidAt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  hallCostId?: string | null
}

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
