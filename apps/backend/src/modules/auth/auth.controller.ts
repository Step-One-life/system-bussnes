import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import type { AuthResult, AuthUser } from '@trikick/shared'

import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import type { CurrentUserPayload } from '../../common/interfaces/current-user.interface'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Жёсткий лимит: 10 попыток за 15 минут с одного адреса. Логин демо-стенда
  // известен из README, а bcrypt на каждой попытке — готовый DoS.
  @Post('register')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Регистрация тренера' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto)
  }

  @Post('login')
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Вход' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Текущий пользователь' })
  me(@CurrentUser() user: CurrentUserPayload): Promise<AuthUser> {
    return this.authService.getProfile(user.id)
  }
}
