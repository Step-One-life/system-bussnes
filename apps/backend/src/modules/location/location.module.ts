import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'

import { LocationController } from './location.controller'
import { Location } from './location.model'
import { LocationService } from './location.service'

@Module({
  imports: [SequelizeModule.forFeature([Location])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService, SequelizeModule],
})
export class LocationModule {}
