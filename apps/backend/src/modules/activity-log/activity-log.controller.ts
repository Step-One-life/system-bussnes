import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import type { ActivityLogPageShape } from '@trikick/shared'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { ActivityLogService } from './activity-log.service'
import { ActivityUndoService } from './activity-undo.service'
import { ListActivityDto } from './dto/list-activity.dto'

@ApiTags('activity-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-log')
export class ActivityLogController {
  constructor(
    private readonly activityLog: ActivityLogService,
    private readonly undoService: ActivityUndoService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Лента журнала действий (порциями)' })
  async list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() q: ListActivityDto,
  ): Promise<ActivityLogPageShape> {
    const { data, nextCursor } = await this.activityLog.list(user.id, q.cursor ?? null)
    return { data: data.map((r) => this.activityLog.toShape(r)), nextCursor }
  }

  @Post(':id/undo')
  @ApiOperation({ summary: 'Откатить событие' })
  async undo(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.undoService.undoOne(user.id, id)
    return { ok: true }
  }

  @Post('batch/:batchId/undo')
  @ApiOperation({ summary: 'Откатить весь пакет' })
  async undoBatch(
    @CurrentUser() user: CurrentUserPayload,
    @Param('batchId') batchId: string,
  ): Promise<{ ok: true }> {
    await this.undoService.undoBatch(user.id, batchId)
    return { ok: true }
  }
}
