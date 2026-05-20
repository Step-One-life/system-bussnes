import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

import type { ScheduleEntry } from '@trikick/shared'

export class ScheduleEntryDto implements ScheduleEntry {
  @ApiProperty({ example: 'Пн' })
  @IsString()
  day!: string

  @ApiProperty({ example: '19:00' })
  @IsString()
  time!: string
}
