import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'

import { DateUtil } from '../../../common/utils/date.util'
import { Training } from '../../training/training.model'
import type { SyncOperation } from '../calendar.constants'
import { CalendarSyncTask } from '../models/calendar-sync-task.model'
import { CalendarConnectionService } from './calendar-connection.service'

@Injectable()
export class CalendarSyncService {
  constructor(
    @InjectModel(CalendarSyncTask) private readonly taskModel: typeof CalendarSyncTask,
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    private readonly connections: CalendarConnectionService,
  ) {}

  /**
   * Поставить upsert тренировки. Без времени → ставим delete (убрать возможное
   * устаревшее событие). No-op, если у тренера нет активного подключения.
   */
  async enqueueUpsert(userId: string, trainingId: string, time: string): Promise<void> {
    if (!time) {
      await this.enqueueDelete(userId, trainingId)
      return
    }
    await this.enqueue(userId, trainingId, 'upsert')
  }

  async enqueueDelete(userId: string, trainingId: string): Promise<void> {
    await this.enqueue(userId, trainingId, 'delete')
  }

  /** Бэкфилл: все будущие тренировки тренера со временем → upsert. */
  async backfill(userId: string): Promise<number> {
    if (!(await this.connections.isActive(userId))) return 0
    const today = DateUtil.todayIso()
    const trainings = await this.trainingModel.findAll({
      where: { userId, date: { [Op.gte]: today }, time: { [Op.ne]: '' } },
    })
    for (const t of trainings) await this.enqueue(userId, t.id, 'upsert')
    return trainings.length
  }

  private async enqueue(
    userId: string,
    trainingId: string,
    operation: SyncOperation,
  ): Promise<void> {
    const conn = await this.connections.findByUser(userId)
    if (!conn || conn.status === 'disconnected' || !conn.calendarId) return
    // Схлопываем незавершённые задачи по этой тренировке — оставляем одну свежую.
    await this.taskModel.destroy({ where: { trainingId, status: 'pending' } })
    await this.taskModel.create({
      userId,
      trainingId,
      operation,
      calendarId: conn.calendarId,
      status: 'pending',
      attempts: 0,
      runAfter: new Date(),
    })
  }
}
