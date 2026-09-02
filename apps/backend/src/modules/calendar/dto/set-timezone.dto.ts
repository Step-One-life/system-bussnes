import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class SetTimezoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timeZone!: string
}
