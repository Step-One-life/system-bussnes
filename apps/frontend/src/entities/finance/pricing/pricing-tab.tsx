import { Button } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { HallPriceRow, PriceRow } from './price-row'
import { CLIENT_GROUPS, HALL_GROUPS } from './pricing-config'
import { usePricingForm } from './use-pricing-form'

import './pricing-tab.scss'

export function PricingTab() {
  const { t } = useTranslation()
  const { values, setValue, submit, saving } = usePricingForm()

  const handlePriceChange = (key: string) => (v: number) => setValue(key, v)

  return (
    <div>
      <div className="fin-section">
        <div className="fin-section__header">
          <h3 className="fin-section__title">{t('finance.pricing.clientTitle')}</h3>
          <span className="fin-section__badge fin-section__badge--income">
            {t('finance.pricing.incomeBadge')}
          </span>
        </div>
        {CLIENT_GROUPS.map((group) => (
          <div className="price-group" key={group.subtitle}>
            <div className="price-group__subtitle">{group.subtitle}</div>
            {group.rows.map((row) => (
              <PriceRow
                key={row.key}
                label={row.label}
                divisor={row.divisor}
                value={values[row.key] ?? 0}
                onChange={handlePriceChange(row.key)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="fin-section">
        <div className="fin-section__header">
          <h3 className="fin-section__title">{t('finance.pricing.hallTitle')}</h3>
          <span className="fin-section__badge fin-section__badge--expense">
            {t('finance.pricing.expenseBadge')}
          </span>
        </div>
        {HALL_GROUPS.map((group) => (
          <div className="price-group" key={group.subtitle}>
            <div className="price-group__subtitle">{group.subtitle}</div>
            {group.rows.map((row) => {
              const rKey = `${row.keyBase}_regular_price`
              const pKey = `${row.keyBase}_prime_price`
              return (
                <HallPriceRow
                  key={row.keyBase}
                  label={row.label}
                  divisor={row.divisor}
                  regularValue={values[rKey] ?? 0}
                  primeValue={values[pKey] ?? 0}
                  onRegularChange={handlePriceChange(rKey)}
                  onPrimeChange={handlePriceChange(pKey)}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="fin-pricing-footer">
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={submit}>
          {t('finance.pricing.save')}
        </Button>
      </div>
    </div>
  )
}
