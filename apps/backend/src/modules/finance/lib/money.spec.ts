import { roundMoney, sumMoney } from '@trikick/shared'

describe('sumMoney', () => {
  it('складывает копеечные суммы без float-дрейфа', () => {
    // 0.1 + 0.2 в float = 0.30000000000000004
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })

  it('не накапливает ошибку на большом количестве слагаемых', () => {
    const values = Array.from({ length: 10000 }, () => 1234.56)
    expect(sumMoney(values)).toBe(12345600)
  })

  it('пустой список — ноль', () => {
    expect(sumMoney([])).toBe(0)
  })

  it('отрицательные значения учитываются', () => {
    expect(sumMoney([100.5, -0.5])).toBe(100)
  })
})

describe('roundMoney', () => {
  it('округляет разность float до копеек', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(1000.005)).toBe(1000.01)
  })

  it('целые суммы не меняются', () => {
    expect(roundMoney(2500)).toBe(2500)
  })
})
