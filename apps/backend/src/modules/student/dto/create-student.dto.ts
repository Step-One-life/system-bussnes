import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

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

  @ApiPropertyOptional({ example: '+7 999 123-45-67', description: 'телефон как введён' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null

  @ApiPropertyOptional({ description: 'заметка тренера об ученике' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null
}
