import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

import type { CreateStudentShape } from '@trikick/shared'

export class CreateStudentDto implements CreateStudentShape {
  @ApiProperty({ example: 'Алексей Иванов' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ type: [String], description: 'id групп' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groups?: string[]
}
