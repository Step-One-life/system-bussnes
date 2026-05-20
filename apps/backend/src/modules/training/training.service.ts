import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { FindOptions } from 'sequelize'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import { DateUtil } from '../../common/utils/date.util'
import { Student } from '../student/student.model'
import { SubscriptionsService } from '../student/subscriptions.service'
import { Visit } from '../student/visit.model'
import { CreateTrainingDto } from './dto/create-training.dto'
import { Training } from './training.model'

@Injectable()
export class TrainingService extends OwnedCrudService<Training> {
  protected readonly searchField: string | null = null

  constructor(
    @InjectModel(Training) private readonly trainingModel: typeof Training,
    @InjectModel(Visit) private readonly visitModel: typeof Visit,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    super(trainingModel)
  }

  protected get include(): FindOptions['include'] {
    return [Student]
  }

  /**
   * Prime-time: weekdays 17:00–19:59, weekends 10:00–19:59.
   * Ported from frontend training-logic.ts.
   */
  static isPrimeTime(date: string, time: string): boolean {
    if (!date || !time) return false
    const dow = new Date(date + 'T00:00:00').getDay()
    const [h, m] = time.split(':').map(Number)
    const mins = h * 60 + (m || 0)
    const isWeekend = dow === 0 || dow === 6
    return isWeekend ? mins >= 600 && mins <= 1199 : mins >= 1020 && mins <= 1199
  }

  /**
   * Create a training. When `deductSessions` is true (default) attendees'
   * sessions are deducted and visits recorded; the seeder passes false to
   * create historical records without re-deducting.
   */
  async createTraining(
    userId: string,
    dto: CreateTrainingDto,
    deductSessions = true,
  ): Promise<Training> {
    const training = await this.createForUser(userId, {
      groupId: dto.groupId,
      date: dto.date,
      time: dto.time ?? '',
      note: dto.note ?? '',
      isPrime: dto.isPrime ?? TrainingService.isPrimeTime(dto.date, dto.time ?? ''),
      sessionDuration: dto.sessionDuration ?? 60,
      recurring: dto.recurring ?? false,
      recurringId: dto.recurringId ?? null,
    })

    if (dto.attendees?.length) {
      if (deductSessions) {
        await this.markAttendance(training, dto.attendees)
      } else {
        await this.attachAttendeesWithVisits(training, dto.attendees)
      }
    }
    return this.findOneForUser(userId, training.id)
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
      await this.subscriptionsService.restore(studentId, training.groupId)
      await visit.destroy()
    }
  }

  /** Delete a recurring series by recurringId. */
  async removeSeries(userId: string, recurringId: string): Promise<number> {
    const trainings = await this.trainingModel.findAll({ where: { userId, recurringId } })
    for (const t of trainings) {
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
