import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IdParamDto } from '../../common/dto/id-param.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { CreateStudentDto } from './dto/create-student.dto'
import {
  CreateSubscriptionDto,
  ExtendSubscriptionDto,
  LinkPaymentDto,
} from './dto/create-subscription.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { Student } from './student.model'
import { StudentService } from './student.service'
import { SubscriptionsService } from './subscriptions.service'

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly activityLog: ActivityLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список учеников' })
  findAll(@CurrentUser() user: CurrentUserPayload): Promise<Student[]> {
    return this.studentService.findEveryForUser(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ученик по id' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<Student> {
    return this.studentService.findOneForUser(user.id, id)
  }

  @Post()
  @ApiOperation({ summary: 'Создать ученика' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateStudentDto): Promise<Student> {
    return this.studentService.createStudent(user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить ученика' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentService.updateStudent(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить ученика' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<void> {
    return this.studentService.removeForUser(user.id, id)
  }

  /* ── Subscriptions ── */

  @Post(':id/subscriptions')
  @ApiOperation({ summary: 'Добавить абонемент' })
  async addSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<Student> {
    await this.studentService.findOneForUser(user.id, id)
    const sub = await this.subscriptionsService.add(id, dto)
    const studentName = await this.activityLog.studentName(id)
    const groupName = await this.activityLog.groupName(dto.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_created',
      batchId: dto.batchId ?? null,
      studentId: id,
      subscriptionId: sub.id,
      summary: { studentName, groupName, sessionsCount: sub.total },
    })
    return this.studentService.findOneForUser(user.id, id)
  }

  @Post(':id/subscriptions/:subId/deduct')
  @ApiOperation({ summary: 'Списать занятие' })
  async deduct(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
  ): Promise<Student> {
    const student = await this.studentService.findOneForUser(user.id, id)
    const sub = student.subscriptions?.find((s) => s.id === subId)
    if (sub) await this.subscriptionsService.deduct(id, sub.groupId, sub.sessionDuration)
    return this.studentService.findOneForUser(user.id, id)
  }

  @Post(':id/subscriptions/:subId/extend')
  @ApiOperation({ summary: 'Продлить срок абонемента' })
  async extend(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: ExtendSubscriptionDto,
  ): Promise<Student> {
    const student = await this.studentService.findOneForUser(user.id, id)
    const sub = student.subscriptions?.find((s) => s.id === subId)
    if (sub) await this.subscriptionsService.extend(id, sub.groupId, dto.days)
    return this.studentService.findOneForUser(user.id, id)
  }

  @Post(':id/subscriptions/:subId/link-payment')
  @ApiOperation({ summary: 'Привязать платёж к абонементу (отметить оплаченным)' })
  async linkPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: LinkPaymentDto,
  ): Promise<Student> {
    await this.studentService.findOneForUser(user.id, id)
    await this.subscriptionsService.linkPayment(user.id, id, subId, dto.paymentId)
    if (dto.logAsPayment) {
      const studentName = await this.activityLog.studentName(id)
      await this.activityLog.log({
        userId: user.id,
        type: 'payment_recorded',
        studentId: id,
        subscriptionId: subId,
        paymentId: dto.paymentId,
        summary: { studentName, amount: dto.amount },
      })
    }
    return this.studentService.findOneForUser(user.id, id)
  }

  @Delete(':id/subscriptions/:subId')
  @ApiOperation({ summary: 'Удалить абонемент' })
  async removeSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
  ): Promise<Student> {
    await this.studentService.findOneForUser(user.id, id)
    await this.subscriptionsService.remove(id, subId)
    return this.studentService.findOneForUser(user.id, id)
  }
}
