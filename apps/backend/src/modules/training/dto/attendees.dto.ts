import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsOptional, IsUUID } from 'class-validator'

export class AttendeesDto {
  @ApiProperty({ type: [String], description: 'id учеников' })
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds!: string[]

  @ApiPropertyOptional({ format: 'uuid', description: 'id пакета массового действия' })
  @IsOptional()
  @IsUUID()
  batchId?: string
}
