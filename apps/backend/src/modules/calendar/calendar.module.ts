import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { SequelizeModule } from '@nestjs/sequelize'

import { Group } from '../group/group.model'
import { Location } from '../location/location.model'
import { Student } from '../student/student.model'
import { Training } from '../training/training.model'
import { CalendarController } from './calendar.controller'
import { CalendarConnection } from './models/calendar-connection.model'
import { CalendarSyncTask } from './models/calendar-sync-task.model'
import { CalendarConnectionService } from './services/calendar-connection.service'
import { CalendarSyncService } from './services/calendar-sync.service'
import { CalendarSyncWorker } from './services/calendar-sync.worker'
import { GoogleOAuthService } from './services/google-oauth.service'
import { TokenCryptoService } from './services/token-crypto.service'

@Module({
  imports: [
    SequelizeModule.forFeature([
      CalendarConnection,
      CalendarSyncTask,
      Training,
      Group,
      Location,
      Student,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        secret: c.get<string>('jwt.secret'),
        signOptions: { expiresIn: '10m' },
      }),
    }),
  ],
  controllers: [CalendarController],
  providers: [
    {
      provide: TokenCryptoService,
      useFactory: (c: ConfigService) => new TokenCryptoService(c),
      inject: [ConfigService],
    },
    CalendarConnectionService,
    GoogleOAuthService,
    CalendarSyncService,
    CalendarSyncWorker,
  ],
  exports: [CalendarSyncService],
})
export class CalendarModule {}
