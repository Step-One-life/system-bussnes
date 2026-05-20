import { InputNumber } from 'antd'

import { useTranslation } from 'react-i18next'

interface PriceFieldProps {
  value: number
  divisor?: number
  prime?: boolean
  onChange: (value: number) => void
}

function PriceField({ value, divisor, prime, onChange }: PriceFieldProps) {
  const { t } = useTranslation()
  const perSession = divisor && divisor > 1 ? Math.round(value / divisor) : null

  const handleValueChange = (v: number | null) =>
    onChange(typeof v === 'number' ? v : 0)

  return (
    <div className="price-row__input-wrap">
      <InputNumber
        className={prime ? 'price-input price-input--prime' : 'price-input'}
        min={0}
        value={value}
        controls={false}
        onChange={handleValueChange}
      />
      <span className="price-row__currency">₽</span>
      {perSession !== null && (
        <span className="price-per">{t('finance.priceRow.perSession', { amount: perSession })}</span>
      )}
    </div>
  )
}

interface PriceRowProps {
  label: string
  value: number
  divisor?: number
  onChange: (value: number) => void
}

export function PriceRow({ label, value, divisor, onChange }: PriceRowProps) {
  return (
    <div className="price-row">
      <span className="price-row__label">{label}</span>
      <PriceField value={value} divisor={divisor} onChange={onChange} />
    </div>
  )
}

interface HallPriceRowProps {
  label: string
  divisor?: number
  regularValue: number
  primeValue: number
  onRegularChange: (value: number) => void
  onPrimeChange: (value: number) => void
}

export function HallPriceRow({
  label,
  divisor,
  regularValue,
  primeValue,
  onRegularChange,
  onPrimeChange,
}: HallPriceRowProps) {
  const { t } = useTranslation()
  return (
    <div className="price-row price-row--hall">
      <span className="price-row__label">{label}</span>
      <div className="price-row__hall-inputs">
        <div className="price-row__input-wrap">
          <span className="hall-slot-mini">{t('finance.priceRow.regular')}</span>
          <PriceField value={regularValue} divisor={divisor} onChange={onRegularChange} />
        </div>
        <div className="price-row__input-wrap">
          <span className="hall-slot-mini hall-slot-mini--prime">
            {t('finance.priceRow.prime')}
          </span>
          <PriceField
            value={primeValue}
            divisor={divisor}
            prime
            onChange={onPrimeChange}
          />
        </div>
      </div>
    </div>
  )
}
