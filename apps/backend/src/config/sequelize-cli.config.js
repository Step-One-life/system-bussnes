// Config for sequelize-cli (migrations). Reads the same .env as the app.
require('dotenv').config()

const common = {
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trick_step',
}

module.exports = {
  development: common,
  test: common,
  production: common,
}
