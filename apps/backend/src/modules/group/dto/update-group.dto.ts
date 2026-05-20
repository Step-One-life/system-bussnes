import { OmitType, PartialType } from '@nestjs/swagger'

import { CreateGroupDto } from './create-group.dto'

/** Name is immutable after creation — only schedule/duration are updatable. */
export class UpdateGroupDto extends PartialType(OmitType(CreateGroupDto, ['name'] as const)) {}
