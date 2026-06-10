/** Округление денежной суммы до копеек (2 знака). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Сумма денежных значений без накопления float-ошибки: каждое слагаемое
 * переводится в целые копейки, складывается, итог возвращается в рублях.
 */
export function sumMoney(values: number[]): number {
  let cents = 0
  for (const v of values) cents += Math.round(v * 100)
  return cents / 100
}
