import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsUUID } from 'class-validator'

export class AttendeesDto {
  @ApiProperty({ type: [String], description: 'id учеников' })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[]
}
