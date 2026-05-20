import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import type { CurrentUserPayload } from '../interfaces/current-user.interface'

/** Injects the authenticated user (from JWT) into a controller method. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserPayload }>()
    return request.user
  },
)
