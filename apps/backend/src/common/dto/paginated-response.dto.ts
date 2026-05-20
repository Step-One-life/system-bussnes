import { ApiProperty } from '@nestjs/swagger'

import type { ApiListResponse } from '@trikick/shared'

/** Generic list payload — matches ApiListResponse<T> from @trikick/shared. */
export class PaginatedResponseDto<T> implements ApiListResponse<T> {
  @ApiProperty({ isArray: true })
  items: T[]

  @ApiProperty()
  total: number

  constructor(items: T[], total: number) {
    this.items = items
    this.total = total
  }
}
