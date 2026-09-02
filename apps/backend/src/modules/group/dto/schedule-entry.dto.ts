import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

import { IsHHmm } from '../../../common/decorators/date-format.decorators'

import type { ScheduleEntry } from '@trikick/shared'

export class ScheduleEntryDto implements ScheduleEntry {
  @ApiProperty({ example: 'Пн' })
  @IsString()
  day!: string

  @ApiProperty({ example: '19:00' })
  @IsHHmm()
  time!: string
}
