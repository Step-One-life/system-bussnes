import { uuid } from './uuid'

/** Новый id пакета для одного пользовательского массового действия. */
export function newBatchId(): string {
  return uuid()
}
