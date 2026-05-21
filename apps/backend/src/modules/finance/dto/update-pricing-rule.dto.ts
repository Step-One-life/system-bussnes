import { OmitType, PartialType } from '@nestjs/swagger'

import type { UpdatePricingRuleShape } from '@trikick/shared'

import { CreatePricingRuleDto } from './create-pricing-rule.dto'

/** Локацию тарифа после создания не меняем. */
export class UpdatePricingRuleDto
  extends PartialType(OmitType(CreatePricingRuleDto, ['locationId'] as const))
  implements UpdatePricingRuleShape {}
