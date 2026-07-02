import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IdParamDto } from '../../common/dto/id-param.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { assertOwned } from '../../common/services/assert-owned'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { Group } from '../group/group.model'
import { CreateStudentDto } from './dto/create-student.dto'
import {
  CreateSubscriptionDto,
  ExtendSubscriptionDto,
  LinkPaymentDto,
  UpdateSubscriptionDto,
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
    @InjectModel(Group) private readonly groupModel: typeof Group,
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
    // Группы абонемента (своя + покрываемые общим) должны принадлежать тренеру:
    // иначе по перебранному UUID можно создать абонемент со ссылкой на чужую группу.
    await assertOwned(
      this.groupModel,
      user.id,
      [dto.groupId, ...(dto.groupIds ?? [])],
      'Группа не найдена',
    )
    const sub = await this.subscriptionsService.add(id, dto)
    const studentName = await this.activityLog.studentName(id)
    const groupName = await this.activityLog.groupName(dto.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_created',
      batchId: dto.batchId ?? null,
      studentId: id,
      subscriptionId: sub.id,
      summary: { studentName, groupName, sessionsCount: sub.total, amount: dto.amount ?? undefined },
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
    // Списываем строго с указанного абонемента (адресно по subId), а не эвристикой
    // по группе. Неизвестный/чужой subId — честный 404, а не молчаливый no-op 200.
    if (!sub) throw new NotFoundException('Абонемент не найден')
    const { sub: updated } = await this.subscriptionsService.deductById(id, subId)
    // Ручное списание (кнопка «Списать занятие») — событие журнала, view-only.
    // Авто-списание при отметке логируется отдельно как attendance_marked,
    // здесь дубля нет: это другой, ручной эндпоинт без тренировки.
    const studentName = await this.activityLog.studentName(id)
    const groupName = await this.activityLog.groupName(sub.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'session_deducted',
      studentId: id,
      subscriptionId: subId,
      summary: { studentName, groupName, remaining: updated.remaining },
    })
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
    // Продлеваем строго указанный абонемент (адресно по subId), не эвристикой.
    // Неизвестный subId — 404, а не молчаливый no-op 200.
    if (!sub) throw new NotFoundException('Абонемент не найден')
    await this.subscriptionsService.extendById(id, subId, dto.days)
    // Продление срока — событие журнала, view-only (нет обратной операции).
    const studentName = await this.activityLog.studentName(id)
    const groupName = await this.activityLog.groupName(sub.groupId)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_extended',
      studentId: id,
      subscriptionId: subId,
      summary: { studentName, groupName },
    })
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

  @Patch(':id/subscriptions/:subId')
  @ApiOperation({ summary: 'Редактировать абонемент (дата/количество/состав групп)' })
  async editSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<Student> {
    const student = await this.studentService.findOneForUser(user.id, id)
    const sub = student.subscriptions?.find((s) => s.id === subId)
    // Неизвестный subId — 404, а не молчаливый no-op 200.
    if (!sub) throw new NotFoundException('Абонемент не найден')
    // IDOR: владение ВСЕМИ новыми группами обязательно (как addSubscription),
    // иначе по перебранному UUID можно переписать абонемент на чужую группу.
    if (dto.groupIds) {
      await assertOwned(this.groupModel, user.id, dto.groupIds, 'Группа не найдена')
    }
    // Имя группы для журнала фиксируем ДО правки: после смены состава
    // sub.groupId может смениться (groupId уходит в groupIds[0]).
    const groupName = await this.activityLog.groupName(sub.groupId)
    await this.subscriptionsService.updateById(id, subId, dto)
    // Редактирование — view-only событие журнала (без обратной операции).
    const studentName = await this.activityLog.studentName(id)
    await this.activityLog.log({
      userId: user.id,
      type: 'subscription_edited',
      studentId: id,
      subscriptionId: subId,
      summary: { studentName, groupName },
    })
    return this.studentService.findOneForUser(user.id, id)
  }

  @Delete(':id/subscriptions/:subId')
  @ApiOperation({ summary: 'Удалить абонемент' })
  async removeSubscription(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('subId') subId: string,
  ): Promise<Student> {
    const student = await this.studentService.findOneForUser(user.id, id)
    // Имена резолвим ДО удаления; groupId абонемента в БД — UUID, groupName() даёт имя.
    const sub = student.subscriptions?.find((s) => s.id === subId)
    await this.subscriptionsService.remove(id, subId)
    // Удаление абонемента — событие журнала (view-only, не откатывается).
    if (sub) {
      const studentName = await this.activityLog.studentName(id)
      const groupName = await this.activityLog.groupName(sub.groupId)
      await this.activityLog.log({
        userId: user.id,
        type: 'subscription_deleted',
        studentId: id,
        subscriptionId: subId,
        summary: { studentName, groupName },
      })
    }
    return this.studentService.findOneForUser(user.id, id)
  }
}
