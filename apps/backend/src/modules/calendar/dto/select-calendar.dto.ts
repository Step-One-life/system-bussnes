import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class SelectCalendarDto {
  @IsOptional()
  @IsString()
  calendarId?: string

  @IsOptional()
  @IsBoolean()
  create?: boolean

  @IsOptional()
  @IsString()
  name?: string
}
