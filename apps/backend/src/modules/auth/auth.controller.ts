import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
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

  @Post('register')
  @ApiOperation({ summary: 'Регистрация тренера' })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto)
  }

  @Post('login')
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
