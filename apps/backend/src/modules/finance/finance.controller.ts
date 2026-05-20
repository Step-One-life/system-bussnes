import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IdParamDto } from '../../common/dto/id-param.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { CreateHallCostDto, UpdateHallCostDto } from './dto/create-hall-cost.dto'
import { CreatePaymentDto, UpdatePaymentDto } from './dto/create-payment.dto'
import { SavePricingDto } from './dto/save-pricing.dto'
import type { FinanceStats } from './finance-stats.service'
import { FinanceStatsService } from './finance-stats.service'
import { HallCost } from './hall-cost.model'
import { HallCostsService } from './hall-costs.service'
import { Payment } from './payment.model'
import { PaymentsService } from './payments.service'
import { PricingService } from './pricing.service'

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly hallCostsService: HallCostsService,
    private readonly pricingService: PricingService,
    private readonly statsService: FinanceStatsService,
  ) {}

  /* ── Payments ── */

  @Get('payments')
  @ApiOperation({ summary: 'Список платежей клиентов' })
  listPayments(@CurrentUser() user: CurrentUserPayload): Promise<Payment[]> {
    return this.paymentsService.findEveryForUser(user.id)
  }

  @Post('payments')
  @ApiOperation({ summary: 'Создать платёж' })
  createPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.createPayment(user.id, dto)
  }

  @Patch('payments/:id')
  @ApiOperation({ summary: 'Обновить платёж' })
  updatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.updateForUser(user.id, id, dto)
  }

  @Delete('payments/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить платёж (каскад расхода зала)' })
  removePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
  ): Promise<void> {
    return this.paymentsService.removePayment(user.id, id)
  }

  /* ── Hall costs ── */

  @Get('hall-costs')
  @ApiOperation({ summary: 'Список расходов зала' })
  listHallCosts(@CurrentUser() user: CurrentUserPayload): Promise<HallCost[]> {
    return this.hallCostsService.findEveryForUser(user.id)
  }

  @Post('hall-costs')
  @ApiOperation({ summary: 'Создать расход зала' })
  createHallCost(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateHallCostDto,
  ): Promise<HallCost> {
    return this.hallCostsService.createHallCost(user.id, dto)
  }

  @Patch('hall-costs/:id')
  @ApiOperation({ summary: 'Обновить расход зала' })
  updateHallCost(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateHallCostDto,
  ): Promise<HallCost> {
    return this.hallCostsService.updateForUser(user.id, id, dto)
  }

  @Delete('hall-costs/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить расход зала' })
  removeHallCost(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
  ): Promise<void> {
    return this.hallCostsService.removeForUser(user.id, id)
  }

  /* ── Pricing ── */

  @Get('pricing')
  @ApiOperation({ summary: 'Цены тренера' })
  getPricing(@CurrentUser() user: CurrentUserPayload): Promise<Record<string, number>> {
    return this.pricingService.get(user.id)
  }

  @Put('pricing')
  @ApiOperation({ summary: 'Сохранить цены' })
  savePricing(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SavePricingDto,
  ): Promise<Record<string, number>> {
    return this.pricingService.save(user.id, dto.data)
  }

  /* ── Stats ── */

  @Get('stats')
  @ApiOperation({ summary: 'Финансовая статистика' })
  @ApiQuery({ name: 'from', required: false })
  getStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
  ): Promise<FinanceStats> {
    return this.statsService.getStats(user.id, from)
  }
}
