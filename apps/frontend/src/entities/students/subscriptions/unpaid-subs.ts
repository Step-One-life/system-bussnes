import type { Subscription } from '../model/types'

/**
 * Неоплаченные абонементы ученика (нет finPaymentId), от новых к старым.
 * Нужны форме «Добавить оплату», чтобы при заведении дохода сразу предложить
 * закрыть им абонемент — иначе доход остаётся «осиротевшим», а карточка висит
 * в «Ожидает оплаты». Зеркально findUnlinkedPayments, но со стороны абонементов.
 */
export function findUnpaidSubscriptions(subs: Subscription[]): Subscription[] {
  return subs
    .filter((s) => !s.finPaymentId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}
