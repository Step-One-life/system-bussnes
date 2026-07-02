import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op, type Transaction } from 'sequelize'

import type { ActivityLogEntryShape, ActivitySummary, ActivityType } from '@trikick/shared'

import { Group } from '../group/group.model'
import { Student } from '../student/student.model'
import { ActivityLog } from './activity-log.model'

interface LogInput {
  userId: string
  type: ActivityType
  batchId?: string | null
  trainingId?: string | null
  studentId?: string | null
  subscriptionId?: string | null
  paymentId?: string | null
  summary: ActivitySummary
}

const PAGE_SIZE = 30

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog) private readonly model: typeof ActivityLog,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    @InjectModel(Group) private readonly groupModel: typeof Group,
  ) {}

  /** Имя ученика для summary (пустая строка, если не найден). */
  async studentName(studentId: string): Promise<string> {
    const s = await this.studentModel.findByPk(studentId)
    return s?.name ?? ''
  }

  /** Имя группы по UUID (на фронте groupId = имя, в БД — UUID). */
  async groupName(groupId: string): Promise<string> {
    const g = await this.groupModel.findByPk(groupId)
    return g?.name ?? ''
  }

  /** Индивидуальная ли группа (контейнер индив./онлайн/парных занятий). */
  async groupIsIndividual(groupId: string): Promise<boolean> {
    const g = await this.groupModel.findByPk(groupId)
    return g?.isIndividual ?? false
  }

  async log(input: LogInput, tx: Transaction | null = null): Promise<ActivityLog> {
    return this.model.create(
      {
        userId: input.userId,
        type: input.type,
        batchId: input.batchId ?? null,
        trainingId: input.trainingId ?? null,
        studentId: input.studentId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        paymentId: input.paymentId ?? null,
        summary: input.summary,
        undoneAt: null,
      },
      { transaction: tx ?? undefined },
    )
  }

  /** Лента порциями: обратный хронопорядок, курсор — created_at последней строки. */
  async list(userId: string, cursor: string | null): Promise<{ data: ActivityLog[]; nextCursor: string | null }> {
    const where: Record<string, unknown> = { userId }
    if (cursor) where.createdAt = { [Op.lt]: new Date(cursor) }
    const rows = await this.model.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: PAGE_SIZE + 1,
    })
    const hasMore = rows.length > PAGE_SIZE
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows
    const nextCursor = hasMore ? page[page.length - 1].createdAt.toISOString() : null
    return { data: page, nextCursor }
  }

  /** Помечает активное событие отменённым (идемпотентно). */
  private async markUndone(
    where: Record<string, unknown>,
    tx: Transaction | null = null,
  ): Promise<void> {
    await this.model.update(
      { undoneAt: new Date() },
      { where: { ...where, undoneAt: { [Op.is]: null } }, transaction: tx ?? undefined },
    )
  }

  async markAttendanceUndone(trainingId: string, studentId: string): Promise<void> {
    await this.markUndone({ type: 'attendance_marked', trainingId, studentId })
  }

  async markTrainingCreatedUndone(trainingId: string): Promise<void> {
    await this.markUndone({ type: 'training_created', trainingId })
  }

  async markSubscriptionUndone(subscriptionId: string): Promise<void> {
    await this.markUndone({ type: 'subscription_created', subscriptionId })
  }

  async markPaymentUndone(paymentId: string, tx: Transaction | null = null): Promise<void> {
    await this.markUndone({ type: 'payment_recorded', paymentId }, tx)
    // Отметка, оплаченная этим платежом (billing='payment'), тоже становится
    // необратимой — платёж удалён, откатывать нечего; иначе у события
    // attendance_marked висела бы активная кнопка «Отменить» (идемпотентно).
    await this.markUndone({ type: 'attendance_marked', paymentId }, tx)
  }

  /** Установить undone_at напрямую (для отката, когда обратная операция недостижима). */
  async setUndoneById(id: string): Promise<void> {
    await this.markUndone({ id })
  }

  toShape(row: ActivityLog): ActivityLogEntryShape {
    return {
      id: row.id,
      type: row.type,
      batchId: row.batchId,
      createdAt: row.createdAt.toISOString(),
      undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
      trainingId: row.trainingId,
      studentId: row.studentId,
      subscriptionId: row.subscriptionId,
      paymentId: row.paymentId,
      summary: row.summary,
    }
  }
}
