import type { SequelizeModuleOptions } from '@nestjs/sequelize'

import type { AppConfig } from './configuration'

/** Sequelize connection options built from app config. */
export function buildDatabaseConfig(config: AppConfig): SequelizeModuleOptions {
  return {
    dialect: 'mysql',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    autoLoadModels: true,
    synchronize: false,
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  }
}
