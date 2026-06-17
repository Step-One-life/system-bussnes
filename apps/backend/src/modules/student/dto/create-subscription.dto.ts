import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'

import type { CreateSubscriptionShape, SubscriptionType, TimeSlot } from '@trikick/shared'

const SUB_TYPES: SubscriptionType[] = ['1', '4', '8', '1_90', '4_90', '8_90', 'sub']
const TIME_SLOTS: TimeSlot[] = ['regular', 'prime']

export class CreateSubscriptionDto implements CreateSubscriptionShape {
  @ApiProperty({ description: 'id группы', format: 'uuid' })
  @IsUUID()
  groupId!: string

  @ApiProperty({ enum: SUB_TYPES })
  @IsIn(SUB_TYPES)
  type!: SubscriptionType

  @ApiPropertyOptional({ description: 'Число занятий (из тарифа). Иначе — по типу.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionsTotal?: number

  @ApiPropertyOptional({ description: 'Дата начала (ISO)' })
  @IsOptional()
  @IsString()
  createdAt?: string

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  sessionDuration?: number

  @ApiPropertyOptional({ default: 35, description: 'Срок действия абонемента (дней)' })
  @IsOptional()
  @IsInt()
  validityDays?: number

  @ApiPropertyOptional({ enum: TIME_SLOTS, default: 'regular', description: 'Слот тарифа (прайм/обычный)' })
  @IsOptional()
  @IsIn(TIME_SLOTS)
  timeSlot?: TimeSlot

  @ApiPropertyOptional({ type: [String], description: 'Общий абонемент: покрываемые группы (UUID)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[]

  @ApiPropertyOptional({ format: 'uuid', description: 'id пакета массового действия' })
  @IsOptional()
  @IsUUID()
  batchId?: string
}

export class ExtendSubscriptionDto {
  @ApiProperty({ description: 'На сколько дней продлить' })
  @IsInt()
  @Min(1)
  days!: number
}

export class LinkPaymentDto {
  @ApiProperty({ description: 'id платежа, который оплачивает абонемент', format: 'uuid' })
  @IsUUID()
  paymentId!: string

  @ApiPropertyOptional({ description: 'Логировать как событие записи оплаты (mark-paid)' })
  @IsOptional()
  @IsBoolean()
  logAsPayment?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number
}
