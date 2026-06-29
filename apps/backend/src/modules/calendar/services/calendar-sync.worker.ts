import { Injectable, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'

import { Group } from '../../group/group.model'
import { Location } from '../../location/location.model'
import { Student } from '../../student/student.model'
import { Training } from '../../training/training.model'
import { SYNC_BATCH, SYNC_INTERVAL_MS, SYNC_MAX_ATTEMPTS } from '../calendar.constants'
import { buildEventResource, type GoogleEventResource } from '../lib/event-builder'
import { eventIdFor } from '../lib/event-id'
import { nextRunAfter } from '../lib/sync-backoff'
import { syncTaskAction } from '../lib/sync-decision'
import { CalendarSyncTask } from '../models/calendar-sync-task.model'
import { CalendarConnectionService } from './calendar-connection.service'
import { CalendarAuthError, GoogleOAuthService } from './google-oauth.service'

@Injectable()
export class CalendarSyncWorker {
  private readonly logger = new Logger(CalendarSyncWorker.name)
  private running = false

  constructor(
    @InjectModel(CalendarSyncTask) private readonly taskModel: typeof CalendarSyncTask,
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Group) private readonly groupModel: typeof Group,
    @InjectModel(Location) private readonly locationModel: typeof Location,
    @InjectModel(Student) private readonly studentModel: typeof Student,
    private readonly connections: CalendarConnectionService,
    private readonly google: GoogleOAuthService,
  ) {}

  @Interval(SYNC_INTERVAL_MS)
  async tick(): Promise<void> {
    if (this.running) return // не накладываем проходы друг на друга
    this.running = true
    try {
      const tasks = await this.taskModel.findAll({
        where: { status: 'pending', runAfter: { [Op.lte]: new Date() } },
        order: [['createdAt', 'ASC']],
        limit: SYNC_BATCH,
      })
      for (const task of tasks) await this.process(task)
    } catch (e) {
      this.logger.error(`Сбой прохода воркера: ${String(e)}`)
    } finally {
      this.running = false
    }
  }

  private async process(task: CalendarSyncTask): Promise<void> {
    const conn = await this.connections.findByUser(task.userId)
    const refreshToken = await this.connections.getRefreshToken(task.userId)
    const action = syncTaskAction(conn?.status ?? null, !!task.calendarId, !!refreshToken)
    if (action === 'skip') {
      // Синхронизация выключена (отключена / нет календаря) — задача неактуальна.
      task.status = 'done'
      await task.save()
      return
    }
    if (action === 'defer') {
      // Нужно переподключение — НЕ теряем задачу: оставляем pending, откладываем.
      // resumePending поднимет её сразу после переподключения.
      task.runAfter = nextRunAfter(SYNC_MAX_ATTEMPTS)
      await task.save()
      return
    }

    try {
      if (task.operation === 'delete') {
        await this.google.deleteEvent(refreshToken!, task.calendarId!, eventIdFor(task.trainingId))
      } else {
        const event = await this.buildEvent(task)
        if (!event) {
          // Тренировка исчезла — нечего синхронизировать.
          task.status = 'done'
          await task.save()
          return
        }
        await this.google.upsertEvent(refreshToken!, task.calendarId!, event)
      }
      task.status = 'done'
      task.lastError = null
      await task.save()
    } catch (e) {
      if (e instanceof CalendarAuthError) {
        await this.connections.setStatus(task.userId, 'needs_reconnect')
        task.lastError = e.message
        task.runAfter = nextRunAfter(SYNC_MAX_ATTEMPTS) // подождать до переподключения
        await task.save()
        return
      }
      task.attempts += 1
      task.lastError = String((e as { message?: string })?.message ?? e)
      if (task.attempts >= SYNC_MAX_ATTEMPTS) {
        task.status = 'failed'
      } else {
        task.runAfter = nextRunAfter(task.attempts)
      }
      await task.save()
    }
  }

  private async buildEvent(task: CalendarSyncTask): Promise<GoogleEventResource | null> {
    const training = await this.trainingModel.findByPk(task.trainingId)
    if (!training || !training.time) return null

    const group = await this.groupModel.findByPk(training.groupId)
    const location = training.locationId
      ? await this.locationModel.findByPk(training.locationId)
      : null

    let studentName: string | null = null
    if (training.plannedStudentId) {
      const s = await this.studentModel.findByPk(training.plannedStudentId)
      studentName = s?.name ?? null
    }

    const conn = await this.connections.findByUser(task.userId)
    return buildEventResource({
      eventId: eventIdFor(training.id),
      groupName: group?.name ?? null,
      studentName,
      date: training.date,
      time: training.time,
      durationMin: training.sessionDuration,
      locationName: location?.name ?? null,
      locationAddress: location?.address ?? null,
      note: training.note,
      isOnline: training.isOnline,
      isPrime: training.isPrime,
      trainingId: training.id,
      timeZone: conn?.calendarTimeZone ?? 'Europe/Moscow',
    })
  }
}
