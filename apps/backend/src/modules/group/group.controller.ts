import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { IdParamDto } from '../../common/dto/id-param.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupDto } from './dto/update-group.dto'
import { Group } from './group.model'
import { GroupService } from './group.service'

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  @ApiOperation({ summary: 'Список групп' })
  findAll(@CurrentUser() user: CurrentUserPayload): Promise<Group[]> {
    return this.groupService.findEveryForUser(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Группа по id' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<Group> {
    return this.groupService.findOneForUser(user.id, id)
  }

  @Post()
  @ApiOperation({ summary: 'Создать группу' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateGroupDto): Promise<Group> {
    return this.groupService.createGroup(user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить группу' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateGroupDto,
  ): Promise<Group> {
    return this.groupService.updateForUser(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить группу' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<void> {
    return this.groupService.removeForUser(user.id, id)
  }
}
