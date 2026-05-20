import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'

import configuration from './config/configuration'
import { validateEnv } from './config/env.validation'
import { DatabaseModule } from './database/database.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AuthModule } from './modules/auth/auth.module'
import { GroupModule } from './modules/group/group.module'
import { StudentModule } from './modules/student/student.module'
import { TrainingModule } from './modules/training/training.module'
import { FinanceModule } from './modules/finance/finance.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    GroupModule,
    StudentModule,
    TrainingModule,
    FinanceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
