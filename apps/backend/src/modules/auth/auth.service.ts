import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import type { AuthResult, AuthUser } from '@trikick/shared'

import { User } from '../user/user.model'
import { UsersService } from '../user/users.service'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase()
    const existing = await this.usersService.findByEmail(email)
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({
      name: dto.name.trim(),
      email,
      passwordHash,
    })
    return this.buildResult(user)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase()
    const user = await this.usersService.findByEmail(email)
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль')
    }
    return this.buildResult(user)
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.usersService.findById(userId)
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден')
    }
    return this.toAuthUser(user)
  }

  private buildResult(user: User): AuthResult {
    const token = this.jwtService.sign({ sub: user.id, email: user.email })
    return { user: this.toAuthUser(user), token }
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    }
  }
}
