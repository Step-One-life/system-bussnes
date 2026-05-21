import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'

import type { LessonKind, PricingFormat } from '@trikick/shared'

import { OwnedCrudService } from '../../common/services/owned-crud.service'
import type { CopyPricingDto } from './dto/copy-pricing.dto'
import type { CreatePricingRuleDto } from './dto/create-pricing-rule.dto'
import { PricingRule } from './pricing-rule.model'

/** Кортеж, однозначно определяющий тариф внутри локации. */
export interface RuleMatch {
  locationId: string
  lessonKind: LessonKind
  format: PricingFormat
  durationMinutes: number
  sessionsCount: number
}

@Injectable()
export class PricingRulesService extends OwnedCrudService<PricingRule> {
  constructor(@InjectModel(PricingRule) private readonly ruleModel: typeof PricingRule) {
    super(ruleModel)
  }

  /** Тарифы тренера; опционально — только одной локации. */
  findEveryForUser(userId: string, locationId?: string): Promise<PricingRule[]> {
    const where = locationId ? { userId, locationId } : { userId }
    return this.ruleModel.findAll({
      where,
      order: [
        ['durationMinutes', 'ASC'],
        ['sessionsCount', 'ASC'],
      ],
    })
  }

  createRule(userId: string, dto: CreatePricingRuleDto): Promise<PricingRule> {
    return this.createForUser(userId, {
      locationId: dto.locationId,
      title: dto.title,
      lessonKind: dto.lessonKind,
      format: dto.format,
      durationMinutes: dto.durationMinutes,
      sessionsCount: dto.sessionsCount,
      clientPrice: dto.clientPrice ?? 0,
      clientPrimePrice: dto.clientPrimePrice ?? 0,
      hallCost: dto.hallCost ?? 0,
      hallPrimeCost: dto.hallPrimeCost ?? 0,
      active: dto.active ?? true,
    })
  }

  /**
   * Ищет тариф по кортежу (локация + вид + формат + длительность + кол-во).
   * Возвращает null, если подходящего тарифа нет.
   */
  findMatch(userId: string, match: RuleMatch): Promise<PricingRule | null> {
    return this.ruleModel.findOne({
      where: {
        userId,
        locationId: match.locationId,
        lessonKind: match.lessonKind,
        format: match.format,
        durationMinutes: match.durationMinutes,
        sessionsCount: match.sessionsCount,
      },
    })
  }

  /** Копирует все тарифы из одной локации тренера в другую. */
  async copy(userId: string, dto: CopyPricingDto): Promise<PricingRule[]> {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Локация-источник и приёмник совпадают')
    }
    const source = await this.ruleModel.findAll({
      where: { userId, locationId: dto.fromLocationId },
    })
    const copies = source.map((rule) => ({
      userId,
      locationId: dto.toLocationId,
      title: rule.title,
      lessonKind: rule.lessonKind,
      format: rule.format,
      durationMinutes: rule.durationMinutes,
      sessionsCount: rule.sessionsCount,
      clientPrice: rule.clientPrice,
      clientPrimePrice: rule.clientPrimePrice,
      hallCost: rule.hallCost,
      hallPrimeCost: rule.hallPrimeCost,
      active: rule.active,
    }))
    await this.ruleModel.bulkCreate(copies)
    return this.findEveryForUser(userId, dto.toLocationId)
  }
}
