import { ApiProperty } from '@nestjs/swagger'
import { IsObject } from 'class-validator'

export class SavePricingDto {
  @ApiProperty({ description: 'Объект цен: ключ → число', type: Object })
  @IsObject()
  data!: Record<string, number>
}
