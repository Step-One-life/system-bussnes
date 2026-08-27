import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'

import { CreateTrainingDto } from './create-training.dto'

/**
 * groupId намеренно исключён: смена группы у существующего занятия меняет
 * биллинг и состав, интерфейс её не предлагает, а через API она позволяла
 * привязать своё занятие к ЧУЖОЙ группе (mass-assignment чужого FK).
 */
export class UpdateTrainingDto extends PartialType(
  OmitType(CreateTrainingDto, ['groupId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Перенос всей серии на N дней (только для PATCH /trainings/recurring). Может быть отрицательным.',
  })
  @IsOptional()
  @IsInt()
  dateShiftDays?: number
}
