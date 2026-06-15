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
import { ActivityLogService } from '../activity-log/activity-log.service'
import { AttendeesDto } from './dto/attendees.dto'
import { CreateTrainingDto } from './dto/create-training.dto'
import { UpdateTrainingDto } from './dto/update-training.dto'
import { Training } from './training.model'
import { TrainingService, type BillingResult } from './training.service'

@ApiTags('trainings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainings')
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly activityLog: ActivityLogService,
  ) {}

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
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTrainingDto,
  ): Promise<Training> {
    const created = await this.trainingService.createTraining(user.id, dto)
    const groupName = await this.activityLog.groupName(created.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'training_created',
      batchId: dto.batchId ?? null,
      trainingId: created.id,
      summary: { groupName, trainingTime: created.time, trainingDate: created.date },
    })
    return created
  }

  @Patch('recurring/:recurringId')
  @ApiOperation({ summary: 'Обновить всю серию повторяющихся тренировок' })
  updateSeries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('recurringId') recurringId: string,
    @Body() dto: UpdateTrainingDto,
  ): Promise<{ updated: number }> {
    return this.trainingService
      .updateSeriesForUser(user.id, recurringId, dto)
      .then((updated) => ({ updated }))
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
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
  ): Promise<void> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    const groupName = await this.activityLog.groupName(training.groupId)
    await this.trainingService.removeTraining(user.id, id)
    await this.activityLog.log({
      userId: user.id,
      type: 'training_deleted',
      trainingId: id,
      summary: { groupName, trainingTime: training.time, trainingDate: training.date },
    })
  }

  @Post(':id/attendees')
  @ApiOperation({ summary: 'Добавить учеников на тренировку (списание/авто-платёж на бэке)' })
  async addAttendees(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: AttendeesDto,
  ): Promise<{ training: Training; billing: BillingResult[] }> {
    const training = await this.trainingService.findOneForUser(user.id, id)
    const billing = await this.trainingService.markAttendance(training, dto.studentIds)
    const groupName = await this.activityLog.groupName(training.groupId)
    for (const b of billing) {
      const studentName = await this.activityLog.studentName(b.studentId)
      await this.activityLog.log({
        userId: user.id,
        type: 'attendance_marked',
        batchId: dto.batchId ?? null,
        trainingId: training.id,
        studentId: b.studentId,
        paymentId: b.paymentId,
        summary: {
          studentName,
          groupName,
          trainingTime: training.time,
          trainingDate: training.date,
          billing: b.billing,
          remaining: b.remaining ?? undefined,
          amount: b.amount ?? undefined,
        },
      })
    }
    return { training: await this.trainingService.findOneForUser(user.id, id), billing }
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
