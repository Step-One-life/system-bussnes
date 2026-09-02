import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

export class SelectCalendarDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  calendarId?: string

  @IsOptional()
  @IsBoolean()
  create?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string
}
