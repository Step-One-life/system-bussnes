import type { Payment } from '../model/types'

/**
 * Доходы ученика, не привязанные ни к одному абонементу (нет их id среди
 * finPaymentId). Нужны, чтобы «Записать оплату» предлагала ПРИВЯЗАТЬ уже
 * существующий доход вместо создания дубля. Доходы с группы (student_id = null)
 * не относятся к абонементам и исключаются. Сортировка — от новых к старым.
 */
export function findUnlinkedPayments(
  payments: Payment[],
  studentId: string,
  linkedPaymentIds: Set<string>,
): Payment[] {
  return payments
    .filter((p) => p.student_id === studentId && !linkedPaymentIds.has(p.id))
    .sort((a, b) => (a.paid_at < b.paid_at ? 1 : a.paid_at > b.paid_at ? -1 : 0))
}
