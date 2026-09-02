import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class ListActivityDto {
  @ApiPropertyOptional({ description: 'created_at последней строки (ISO) для следующей порции' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cursor?: string
}
