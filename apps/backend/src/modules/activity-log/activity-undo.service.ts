import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import { PaymentsService } from '../finance/payments.service'
import { SubscriptionsService } from '../student/subscriptions.service'
import { Subscription } from '../student/subscription.model'
import { TrainingService } from '../training/training.service'
import { ActivityLog } from './activity-log.model'
import { ActivityLogService } from './activity-log.service'
import { isUndoable } from './activity-log.types'

@Injectable()
export class ActivityUndoService {
  constructor(
    @InjectModel(ActivityLog) private readonly model: typeof ActivityLog,
    @InjectModel(Subscription) private readonly subModel: typeof Subscription,
    private readonly activityLog: ActivityLogService,
    private readonly trainingService: TrainingService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /** Откатить одно событие. Идемпотентно: уже отменённое/view-only/недостижимое = no-op. */
  async undoOne(userId: string, id: string): Promise<void> {
    const row = await this.model.findOne({ where: { id, userId } })
    if (!row || row.undoneAt || !isUndoable(row.type)) return
    try {
      await this.performReverse(userId, row)
    } catch (e) {
      if (e instanceof NotFoundException) {
        // Объект уже удалён вручную — просто помечаем событие отменённым.
        await this.activityLog.setUndoneById(row.id)
        return
      }
      throw e
    }
    // На случай, если обратная операция не имеет хука markUndone для этого типа.
    await this.activityLog.setUndoneById(row.id)
  }

  /** Откатить все ещё активные дочерние события пакета. */
  async undoBatch(userId: string, batchId: string): Promise<void> {
    const rows = await this.model.findAll({ where: { userId, batchId } })
    for (const row of rows) {
      if (row.undoneAt || !isUndoable(row.type)) continue
      await this.undoOne(userId, row.id)
    }
  }

  private async performReverse(userId: string, row: ActivityLog): Promise<void> {
    switch (row.type) {
      case 'attendance_marked': {
        if (!row.trainingId || !row.studentId) return
        const training = await this.trainingService.findOneForUser(userId, row.trainingId)
        await this.trainingService.removeAttendee(training, row.studentId)
        return
      }
      case 'training_created': {
        if (!row.trainingId) return
        await this.trainingService.removeTraining(userId, row.trainingId)
        return
      }
      case 'subscription_created': {
        if (!row.studentId || !row.subscriptionId) return
        const sub = await this.subModel.findByPk(row.subscriptionId)
        if (sub?.finPaymentId) {
          await this.paymentsService
            .removePayment(userId, sub.finPaymentId)
            .catch(() => undefined)
        }
        await this.subscriptionsService.remove(row.studentId, row.subscriptionId)
        return
      }
      case 'payment_recorded': {
        if (!row.paymentId) return
        await this.paymentsService.removePayment(userId, row.paymentId)
        return
      }
      default:
        return
    }
  }
}
