import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'

import { DateUtil } from '../../../common/utils/date.util'
import { Training } from '../../training/training.model'
import { SYNC_BACKFILL_LOOKBACK_DAYS, type SyncOperation } from '../calendar.constants'
import { backfillCutoff } from '../lib/sync-decision'
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

  /**
   * Бэкфилл: тренировки тренера со временем за окно (последние N дней + всё
   * будущее) → upsert. Прошлое в окне нужно, чтобы при подключении в календарь
   * уехало текущее расписание целиком, а не только будущие даты.
   */
  async backfill(userId: string): Promise<number> {
    if (!(await this.connections.isActive(userId))) return 0
    const since = backfillCutoff(DateUtil.todayIso(), SYNC_BACKFILL_LOOKBACK_DAYS)
    const trainings = await this.trainingModel.findAll({
      where: { userId, date: { [Op.gte]: since }, time: { [Op.ne]: '' } },
    })
    for (const t of trainings) await this.enqueue(userId, t.id, 'upsert')
    return trainings.length
  }

  /**
   * После переподключения поднять отложенные задачи тренера (runAfter = now),
   * чтобы недосинхроненное во время needs_reconnect доехало без ожидания бэкоффа.
   */
  async resumePending(userId: string): Promise<void> {
    await this.taskModel.update({ runAfter: new Date() }, { where: { userId, status: 'pending' } })
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
