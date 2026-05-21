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
import { CreateLocationDto } from './dto/create-location.dto'
import { UpdateLocationDto } from './dto/update-location.dto'
import { Location } from './location.model'
import { LocationService } from './location.service'

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ApiOperation({ summary: 'Список локаций' })
  findAll(@CurrentUser() user: CurrentUserPayload): Promise<Location[]> {
    return this.locationService.findEveryForUser(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Локация по id' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<Location> {
    return this.locationService.findOneForUser(user.id, id)
  }

  @Post()
  @ApiOperation({ summary: 'Создать локацию' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLocationDto,
  ): Promise<Location> {
    return this.locationService.createLocation(user.id, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить локацию' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param() { id }: IdParamDto,
    @Body() dto: UpdateLocationDto,
  ): Promise<Location> {
    return this.locationService.updateLocation(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить локацию' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param() { id }: IdParamDto): Promise<void> {
    return this.locationService.removeForUser(user.id, id)
  }
}
