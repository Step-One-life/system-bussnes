import type { ClientPaymentType, LessonKind } from '@trikick/shared'

/** Минимум данных тренировки, влияющих на тариф разового посещения. */
export interface AttendanceTrainingInfo {
  isPair: boolean
  isOnline: boolean
  sessionDuration: number
}

/** Одна попытка поиска тарифа (кортеж без локации). */
export interface PricingAttempt {
  lessonKind: LessonKind
  format: 'single'
  durationMinutes: number
  sessionsCount: 1
}

export interface AttendancePricing {
  /** Упорядоченные попытки поиска тарифа (для онлайна — с фолбэком). */
  attempts: PricingAttempt[]
  paymentType: ClientPaymentType
}

/**
 * Маппит тренировку в кортеж(и) тарифа и тип разового платежа. Зеркало
 * исторической фронтовой логики (`subPaymentType` + `subTypeToTuple`),
 * включая особенность «групповая 90 мин → индивидуальный разовый тариф».
 */
export function attendancePricing(
  training: AttendanceTrainingInfo,
  groupIsIndividual: boolean,
): AttendancePricing {
  const dur = training.sessionDuration === 90 ? 90 : 60
  const single = (lessonKind: LessonKind): PricingAttempt => ({
    lessonKind,
    format: 'single',
    durationMinutes: dur,
    sessionsCount: 1,
  })
  const individualType: ClientPaymentType =
    dur === 90 ? 'single_individual_90' : 'single_individual'

  if (training.isPair) {
    return {
      attempts: [single('pair')],
      paymentType: dur === 90 ? 'single_pair_90' : 'single_pair',
    }
  }
  if (training.isOnline) {
    return { attempts: [single('online'), single('individual')], paymentType: individualType }
  }
  if (groupIsIndividual || dur === 90) {
    return { attempts: [single('individual')], paymentType: individualType }
  }
  return { attempts: [single('group')], paymentType: 'single_group' }
}
