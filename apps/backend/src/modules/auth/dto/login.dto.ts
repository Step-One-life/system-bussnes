import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'

import type { LoginShape } from '@trikick/shared'

export class LoginDto implements LoginShape {
  @ApiProperty({ example: 'trainer@trikick.ru' })
  @IsEmail()
  @MaxLength(255)
  email!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string
}
