import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator'

import type { CreateSubscriptionShape, SubscriptionType } from '@trikick/shared'

const SUB_TYPES: SubscriptionType[] = ['1', '4', '8', '1_90', '4_90', '8_90']

export class CreateSubscriptionDto implements CreateSubscriptionShape {
  @ApiProperty({ description: 'id группы', format: 'uuid' })
  @IsUUID()
  groupId!: string

  @ApiProperty({ enum: SUB_TYPES })
  @IsIn(SUB_TYPES)
  type!: SubscriptionType

  @ApiPropertyOptional({ description: 'Дата начала (ISO)' })
  @IsOptional()
  @IsString()
  createdAt?: string

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  sessionDuration?: number
}

export class ExtendSubscriptionDto {
  @ApiProperty({ description: 'На сколько дней продлить' })
  @IsInt()
  days!: number
}
