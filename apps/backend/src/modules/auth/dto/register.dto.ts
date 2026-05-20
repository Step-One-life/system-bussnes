import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

import type { RegisterShape } from '@trikick/shared'

export class RegisterDto implements RegisterShape {
  @ApiProperty({ example: 'Иван Тренеров' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ example: 'trainer@trikick.ru' })
  @IsEmail()
  email!: string

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string
}
