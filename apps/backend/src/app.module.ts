import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import configuration from './config/configuration'
import { validateEnv } from './config/env.validation'
import { DatabaseModule } from './database/database.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AuthModule } from './modules/auth/auth.module'
import { GroupModule } from './modules/group/group.module'
import { LocationModule } from './modules/location/location.module'
import { StudentModule } from './modules/student/student.module'
import { TrainingModule } from './modules/training/training.module'
import { FinanceModule } from './modules/finance/finance.module'
import { CalendarModule } from './modules/calendar/calendar.module'
import { ActivityLogModule } from './modules/activity-log/activity-log.module'
import { ActivityUndoModule } from './modules/activity-log/activity-undo.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    // Ограничение частоты запросов. Главная цель — /auth/login: логин демо
    // известен из README, а каждая попытка жжёт CPU на bcrypt, так что
    // неограниченный поток и подбирает пароль, и кладёт единственный процесс.
    // ВАЖНО: именованные лимиты применяются ко ВСЕМ маршрутам сразу, поэтому
    // жёсткий «auth» здесь не объявляем — иначе обычные запросы упираются в
    // 429 (проверено вживую). Маршруты входа переопределяют базовый лимит
    // локально через @Throttle({ default: ... }).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 200 }]),
    DatabaseModule,
    AuthModule,
    GroupModule,
    LocationModule,
    StudentModule,
    TrainingModule,
    FinanceModule,
    CalendarModule,
    ActivityLogModule,
    ActivityUndoModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
