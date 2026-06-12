import { useQuery } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { resolvePricingRule } from 'entities/finance/lib/pricing-lookup'
import { useLocations } from 'entities/locations'

import { isPrimeTime } from '../model/training-logic'

import type { TrainingConflict } from '../model/types'
import type { LessonKind } from 'entities/finance/model/types'

import './training-modals.scss'

function formatRub(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₽`
}

/**
 * Контекстный индикатор прайм-тайма у поля «Время». В обычное время не
 * рендерит ничего. При prime — warning-чип; если переданы duration и
 * lessonKind и в настройках цен есть тариф разового занятия — рядом
 * влияние на цену («занятие X ₽ вместо Y ₽»).
 */
export function PrimeHint({
  date,
  time,
  locationId,
  duration,
  lessonKind,
}: {
  date: string
  time: string
  locationId?: string | null
  duration?: number
  lessonKind?: LessonKind
}) {
  const { t } = useTranslation()
  const { data: locations = [] } = useLocations()

  const location = locationId ? (locations.find((l) => l.id === locationId) ?? null) : null
  const prime = !!time && isPrimeTime(date, time, location)

  const { data: priceLookup } = useQuery({
    queryKey: ['prime-price', locationId ?? null, lessonKind, duration],
    queryFn: () =>
      resolvePricingRule(locationId ?? null, {
        lessonKind: lessonKind!,
        format: 'single',
        durationMinutes: duration!,
        sessionsCount: 1,
      }),
    enabled: prime && !!duration && !!lessonKind,
  })

  if (!prime) return null

  // Суммы — только из «Настройки цен» (pricing_rules); обе цены должны быть
  // заполнены и различаться, иначе чип без сумм.
  const rule = priceLookup?.rule ?? null
  const showPrice =
    !!rule &&
    rule.client_price > 0 &&
    rule.client_prime_price > 0 &&
    rule.client_prime_price !== rule.client_price

  return (
    <div className="prime-hint">
      <span className="prime-hint__chip">{t('trainings.hint.prime')}</span>
      {showPrice && (
        <span className="prime-hint__price">
          {t('trainings.hint.primePrice', {
            prime: formatRub(rule.client_prime_price),
            regular: formatRub(rule.client_price),
          })}
        </span>
      )}
    </div>
  )
}

export function ConflictHint({ conflicts }: { conflicts: TrainingConflict[] }) {
  const { t } = useTranslation()
  if (!conflicts.length) return null
  const detail = conflicts.map((c) => `«${c.groupId}» ${c.start}–${c.end}`).join(', ')
  return (
    <div className="conflict-hint is-visible">{t('trainings.hint.conflict', { detail })}</div>
  )
}
