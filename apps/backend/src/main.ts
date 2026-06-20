import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // Swagger раскрывает полную карту API (ручки, DTO, имена полей) — в проде это
  // помогает разведке для перебора UUID, поэтому документацию поднимаем только
  // вне production.
  const swaggerEnabled = process.env.NODE_ENV !== 'production'
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TriKick API')
      .setDescription('API менеджера тренировок TriKick')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = config.get<number>('port') ?? 3021
  await app.listen(port, '0.0.0.0')
  console.log(`TriKick API запущен на http://localhost:${port}/api`)
  if (swaggerEnabled) {
    console.log(`Swagger UI: http://localhost:${port}/api/docs`)
  }
}

void bootstrap()
