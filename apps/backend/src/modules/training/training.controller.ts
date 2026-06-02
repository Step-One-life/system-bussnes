import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IdParamDto } from '../../common/dto/id-param.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { AttendeesDto } from './dto/attendees.dto'
import { CreateTrainingDto } from './dto/create-training.dto'
import { UpdateTrainingDto } from './dto/update-training.dto'
import { Training } from './training.model'
import { TrainingService } from './training.service'

@ApiTags('trainings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @ApiOperation({ summary: 'Список тренировок' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<Training[]> {
    return this.trainingService.findInRange(user.id, from, to)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Тренировка по id' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<Training> {
    return this.trainingService.findOneForUser(user.id, id)
  }

  @Post()
  @ApiOperation({ summary: 'Создать тренировку (со списанием занятий)' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTrainingDto,
  ): Promise<Training> {
    return this.trainingService.createTraining(user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить тренировку' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateTrainingDto,
  ): Promise<Training> {
    return this.trainingService.updateForUser(user.id, id, dto)
  }

  @Delete('recurring/:recurringId')
  @ApiOperation({ summary: 'Удалить серию повторяющихся тренировок' })
  removeSeries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('recurringId') recurringId: string,
  ): Promise<{ removed: number }> {
    return this.trainingService
      .removeSeries(user.id, recurringId)
      .then((removed) => ({ removed }))
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить тренировку (восстанавливает занятия учеников)' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<void> {
    return this.trainingService.removeTraining(user.id, id)
  }

  @Post(':id/attendees')
  @ApiOperation({ summary: 'Добавить учеников на тренировку' })
  async addAttendees(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: AttendeesDto,
  ): Promise<Training> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    await this.trainingService.markAttendance(training, dto.studentIds)
    return this.trainingService.findOneForUser(user.id, id)
  }

  @Delete(':id/attendees/:studentId')
  @ApiOperation({ summary: 'Убрать ученика с тренировки' })
  async removeAttendee(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ): Promise<Training> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    await this.trainingService.removeAttendee(training, studentId)
    return this.trainingService.findOneForUser(user.id, id)
  }
}
