import { IsNotEmpty, IsString } from 'class-validator'

export class SetTimezoneDto {
  @IsString()
  @IsNotEmpty()
  timeZone!: string
}
