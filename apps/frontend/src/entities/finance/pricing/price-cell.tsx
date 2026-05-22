import { getMarginTone } from './pricing-utils'

interface PriceCellProps {
  regular: number
  prime: number
  /** Раскрашивать значения по знаку (используется для колонки «Маржа»). */
  colored?: boolean
}

/** Ячейка с обычной ценой и Prime-ценой в две строки. */
export function PriceCell({ regular, prime, colored = false }: PriceCellProps) {
  const regularClass = colored ? ` price-cell__value--${getMarginTone(regular)}` : ''
  const primeClass = colored ? ` price-cell__value--${getMarginTone(prime)}` : ''

  return (
    <div className="price-cell">
      <span className={`price-cell__value${regularClass}`}>{regular} ₽</span>
      <span className={`price-cell__value price-cell__value--prime${primeClass}`}>
        <span className="price-cell__star">★</span>
        {prime} ₽
      </span>
    </div>
  )
}
