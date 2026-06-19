import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

import type { CreatePricingRuleShape, LessonKind, PricingFormat } from '@trikick/shared'

const LESSON_KINDS: LessonKind[] = ['individual', 'group', 'online', 'shared', 'pair']
const FORMATS: PricingFormat[] = ['single', 'subscription', 'unlimited']

export class CreatePricingRuleDto implements CreatePricingRuleShape {
  @ApiProperty()
  @IsUUID()
  locationId!: string

  @ApiProperty({ example: 'Индив. абонемент 4' })
  @IsString()
  @IsNotEmpty()
  title!: string

  @ApiProperty({ enum: LESSON_KINDS })
  @IsIn(LESSON_KINDS)
  lessonKind!: LessonKind

  @ApiProperty({ enum: FORMATS })
  @IsIn(FORMATS)
  format!: PricingFormat

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  durationMinutes!: number

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  sessionsCount!: number

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clientPrice?: number

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clientPrimePrice?: number

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hallCost?: number

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hallPrimeCost?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @ApiPropertyOptional({ default: 35, description: 'Срок действия абонемента (дней)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number
}
