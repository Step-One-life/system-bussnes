import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'

/** Single error format for the whole API. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    let message = 'Внутренняя ошибка сервера'
    let error: string | undefined

    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      if (typeof response === 'string') {
        message = response
      } else if (typeof response === 'object') {
        const body = response as Record<string, unknown>
        message = Array.isArray(body.message)
          ? (body.message as string[]).join(', ')
          : ((body.message as string) ?? message)
        error = body.error as string | undefined
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(exception.stack)
    }

    void reply.status(status).send({
      success: false,
      statusCode: status,
      message,
      error,
    })
  }
}
