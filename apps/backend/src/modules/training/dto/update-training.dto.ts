import { ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'

import { CreateTrainingDto } from './create-training.dto'

export class UpdateTrainingDto extends PartialType(CreateTrainingDto) {
  @ApiPropertyOptional({
    description: 'Перенос всей серии на N дней (только для PATCH /trainings/recurring). Может быть отрицательным.',
  })
  @IsOptional()
  @IsInt()
  dateShiftDays?: number
}
