import { ConflictException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { FindOptions } from 'sequelize'

import { isPrimeTime } from '@trikick/shared'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { CalendarSyncService } from '../calendar/services/calendar-sync.service'
import { LocationService } from '../location/location.service'
import { Student } from '../student/student.model'
import { SubscriptionsService } from '../student/subscriptions.service'
import { Visit } from '../student/visit.model'
import { CreateTrainingDto } from './dto/create-training.dto'
import { seriesUpdateFields, type SeriesUpdateInput } from './lib/series-update'
import { findOverlaps } from './lib/training-overlap'
import { Training } from './training.model'

@Injectable()
export class TrainingService extends OwnedCrudService<Training> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Visit) private readonly visitModel: typeof Visit,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly locationService: LocationService,
    private readonly calendarSync: CalendarSyncService,
  ) {
    super(trainingModel)
  }

  protected get include(): FindOptions['include'] {
    return [Student]
  }

  /**
   * Create a training. When `deductSessions` is true (default) attendees'
   * sessions are deducted and visits recorded; the seeder passes false to
   * create historical records without re-deducting.
   *
   * Если `dto.isPrime` не передан, признак прайм-тайма выводится из времени
   * с учётом кастомного окна локации (если она указана). Логика общая с
   * фронтом — функция `isPrimeTime` из `@trikick/shared`.
   */
  async createTraining(
    userId: string,
    dto: CreateTrainingDto,
    deductSessions = true,
  ): Promise<Training> {
    // Серверный барьер от наслоения: занятие с временем не должно пересекаться
    // по времени с другим занятием тренера в тот же день. Сидер (deductSessions
    // = false) создаёт исторические записи и проверку пропускает.
    if (deductSessions && dto.time) {
      const sameDay = await this.trainingModel.findAll({
        where: { userId, date: dto.date },
      })
      const overlaps = findOverlaps(
        { date: dto.date, time: dto.time, durationMinutes: dto.sessionDuration ?? 60 },
        sameDay.map((t) => ({
          id: t.id,
          date: t.date,
          time: t.time,
          sessionDuration: t.sessionDuration,
        })),
      )
      if (overlaps.length) {
        throw new ConflictException('Время занятия пересекается с другим занятием')
      }
    }

    let isPrime = dto.isPrime
    if (isPrime === undefined) {
      const location = dto.locationId
        ? await this.locationService.findOneForUser(userId, dto.locationId).catch(() => null)
        : null
      isPrime = isPrimeTime(dto.date, dto.time ?? '', location)
    }

    const training = await this.createForUser(userId, {
      groupId: dto.groupId,
      locationId: dto.locationId ?? null,
      date: dto.date,
      time: dto.time ?? '',
      note: dto.note ?? '',
      isPrime,
      sessionDuration: dto.sessionDuration ?? 60,
      recurring: dto.recurring ?? false,
      recurringId: dto.recurringId ?? null,
      isOnline: dto.isOnline ?? false,
      plannedStudentId: dto.plannedStudentId ?? null,
    })

    if (dto.attendees?.length) {
      if (deductSessions) {
        await this.markAttendance(training, dto.attendees)
      } else {
        await this.attachAttendeesWithVisits(training, dto.attendees)
      }
    }
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return this.findOneForUser(userId, training.id)
  }

  /** Обновление + постановка синхронизации события. */
  async updateForUser(userId: string, id: string, data: object): Promise<Training> {
    const training = await super.updateForUser(userId, id, data)
    await this.calendarSync.enqueueUpsert(userId, training.id, training.time)
    return training
  }

  /**
   * Обновить все занятия повторяющейся серии. Распространяемые поля (время/локация/
   * заметка/онлайн) применяются ко всем; дата НЕ трогается (у каждого своя). Прайм
   * пересчитывается по дате каждого занятия. На каждое занятие ставится upsert.
   */
  async updateSeriesForUser(
    userId: string,
    recurringId: string,
    dto: SeriesUpdateInput,
  ): Promise<number> {
    const fields = seriesUpdateFields(dto)
    const trainings = await this.trainingModel.findAll({ where: { userId, recurringId } })
    // Смена времени применяется ко всей серии — проверяем, что ни одно занятие
    // серии не наслаивается на занятие вне серии в свою дату. Сначала проверяем
    // все, и только потом сохраняем (не оставляем серию частично сдвинутой).
    if (fields.time !== undefined) {
      const seriesIds = trainings.map((t) => t.id)
      for (const t of trainings) {
        const sameDay = await this.trainingModel.findAll({
          where: { userId, date: t.date },
        })
        const overlaps = findOverlaps(
          { date: t.date, time: fields.time, durationMinutes: t.sessionDuration },
          sameDay.map((x) => ({
            id: x.id,
            date: x.date,
            time: x.time,
            sessionDuration: x.sessionDuration,
          })),
          seriesIds,
        )
        if (overlaps.length) {
          throw new ConflictException(`Серия пересекается с другим занятием (${t.date})`)
        }
      }
    }
    for (const t of trainings) {
      if (fields.time !== undefined) t.time = fields.time
      if (fields.locationId !== undefined) t.locationId = fields.locationId
      if (fields.note !== undefined) t.note = fields.note
      if (fields.isOnline !== undefined) t.isOnline = fields.isOnline
      const location = t.locationId
        ? await this.locationService.findOneForUser(userId, t.locationId).catch(() => null)
        : null
      t.isPrime = isPrimeTime(t.date, t.time, location)
      await t.save()
      await this.calendarSync.enqueueUpsert(userId, t.id, t.time)
    }
    return trainings.length
  }

  /** Deduct one session per attendee and record visits. */
  async markAttendance(training: Training, studentIds: string[]): Promise<void> {
    await training.$add('attendees', studentIds)
    for (const studentId of studentIds) {
      await this.subscriptionsService.deduct(
        studentId,
        training.groupId,
        training.sessionDuration,
      )
      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
      })
    }
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }

  /** Attach attendees and record visits WITHOUT deducting sessions (seeder). */
  async attachAttendeesWithVisits(training: Training, studentIds: string[]): Promise<void> {
    await training.$add('attendees', studentIds)
    for (const studentId of studentIds) {
      await this.visitModel.create({
        studentId,
        groupId: training.groupId,
        trainingId: training.id,
        date: training.date,
      })
    }
  }

  /** Remove a student from a training: restore session + delete visit. */
  async removeAttendee(training: Training, studentId: string): Promise<void> {
    await training.$remove('attendees', studentId)
    const visit = await this.visitModel.findOne({
      where: { trainingId: training.id, studentId },
    })
    if (visit) {
      await this.subscriptionsService.restore(studentId, training.groupId, training.sessionDuration)
      await visit.destroy()
    }
    await this.calendarSync.enqueueUpsert(training.userId, training.id, training.time)
  }

  /** Delete a training: restore sessions and remove visits for every attendee. */
  async removeTraining(userId: string, id: string): Promise<void> {
    const training = await this.findOneForUser(userId, id)
    const attendeeIds = (training.attendees ?? []).map((s) => s.id)
    for (const studentId of attendeeIds) {
      const visit = await this.visitModel.findOne({ where: { trainingId: id, studentId } })
      if (visit) {
        await this.subscriptionsService.restore(studentId, training.groupId, training.sessionDuration)
        await visit.destroy()
      }
    }
    await this.calendarSync.enqueueDelete(userId, training.id)
    await training.destroy()
  }

  /** Delete a recurring series by recurringId, restoring sessions for all attendees. */
  async removeSeries(userId: string, recurringId: string): Promise<number> {
    const trainings = await this.trainingModel.findAll({
      where: { userId, recurringId },
      include: [Student],
    })
    for (const t of trainings) {
      const attendeeIds = (t.attendees ?? []).map((s) => s.id)
      for (const studentId of attendeeIds) {
        const visit = await this.visitModel.findOne({ where: { trainingId: t.id, studentId } })
        if (visit) {
          await this.subscriptionsService.restore(studentId, t.groupId, t.sessionDuration)
          await visit.destroy()
        }
      }
      await this.calendarSync.enqueueDelete(userId, t.id)
      await t.destroy()
    }
    return trainings.length
  }

  /** Trainings within a date range. */
  async findInRange(userId: string, from?: string, to?: string): Promise<Training[]> {
    const trainings = await this.findEveryForUser(userId)
    if (!from && !to) return trainings
    return trainings.filter((t) => {
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      return true
    })
  }

  /** Today as ISO — convenience used by callers. */
  static today(): string {
    return DateUtil.todayIso()
  }
}
