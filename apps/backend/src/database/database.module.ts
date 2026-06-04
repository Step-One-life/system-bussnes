import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'

import { buildDatabaseConfig } from '../config/database.config'
import type { AppConfig } from '../config/configuration'

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config: AppConfig = {
          nodeEnv: configService.getOrThrow('nodeEnv'),
          port: configService.getOrThrow('port'),
          db: configService.getOrThrow('db'),
          jwt: configService.getOrThrow('jwt'),
          corsOrigin: configService.getOrThrow('corsOrigin'),
          google: configService.getOrThrow('google'),
          calendarTokenEncKey: configService.getOrThrow('calendarTokenEncKey'),
          frontendUrl: configService.getOrThrow('frontendUrl'),
        }
        return buildDatabaseConfig(config)
      },
    }),
  ],
})
export class DatabaseModule {}
