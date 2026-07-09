/**
 * Ссылки из телефона ученика: звонок, WhatsApp, Telegram.
 * Телефон хранится «как введён» — нормализация только здесь, при построении ссылок.
 */

/** Только цифры номера; российское «8XXXXXXXXXX» приводим к международному «7…». */
export function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

/** Номер пригоден для ссылок (wa.me/t.me требуют полный номер). */
export function isLinkablePhone(phone: string | null | undefined): phone is string {
  return !!phone && phoneDigits(phone).length >= 10
}

/** tel: сохраняет ведущий «+», остальные символы-разделители убирает. */
export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  return `tel:${cleaned.startsWith('+') ? `+${cleaned.replace(/\+/g, '')}` : phoneDigits(phone)}`
}

export function waHref(phone: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function tgHref(phone: string): string {
  return `https://t.me/+${phoneDigits(phone)}`
}
