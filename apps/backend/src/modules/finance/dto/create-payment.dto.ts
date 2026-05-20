import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator'

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
]

export class CreatePaymentDto implements CreatePaymentShape {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  studentId?: string | null

  @ApiProperty({ enum: CLIENT_TYPES })
  @IsIn(CLIENT_TYPES)
  clientPaymentType!: ClientPaymentType

  @ApiProperty()
  @IsNumber()
  clientAmount!: number

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
