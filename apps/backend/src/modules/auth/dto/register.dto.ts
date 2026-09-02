import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

import type { RegisterShape } from '@trikick/shared'

export class RegisterDto implements RegisterShape {
  @ApiProperty({ example: 'Иван Тренеров' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string

  @ApiProperty({ example: 'trainer@trikick.ru' })
  @IsEmail()
  @MaxLength(255)
  email!: string

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string
}
