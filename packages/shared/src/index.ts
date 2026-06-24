export * from './enums'
export * from './domain/auth'
export * from './domain/group'
export * from './domain/student'
export * from './domain/training'
export * from './domain/location'
export * from './api/common'
export * from './api/shapes'

// Runtime-экспорты — именованные, чтобы rollup (vite) корректно линковал их
// при бандле CommonJS-сборки shared. `export *` от модулей с runtime-кодом
// раскрывается tsc в `__exportStar(require(...))`, и rollup не видит
// конкретных имён.
export { isPrimeTime } from './lib/prime-time'
export type { PrimeWindow } from './lib/prime-time'
export { SUB_TYPE_TOTALS } from './lib/subscription-totals'
export { roundMoney, sumMoney } from './lib/money'
