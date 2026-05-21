import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

import type { CopyPricingShape } from '@trikick/shared'

export class CopyPricingDto implements CopyPricingShape {
  @ApiProperty({ description: 'Локация-источник тарифов' })
  @IsUUID()
  fromLocationId!: string

  @ApiProperty({ description: 'Локация-приёмник тарифов' })
  @IsUUID()
  toLocationId!: string
}
