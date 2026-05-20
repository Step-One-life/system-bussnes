import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

import type { LoginShape } from '@trikick/shared'

export class LoginDto implements LoginShape {
  @ApiProperty({ example: 'trainer@trikick.ru' })
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string
}
