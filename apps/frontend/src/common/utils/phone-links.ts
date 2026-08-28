/**
 * Ссылки и поиск по телефону ученика. Номер хранится «как введён», поэтому
 * вся нормализация живёт здесь и только здесь.
 */

/** Добавочный: всё после «доб», «ext», «#» — в номер для звонка не входит. */
function stripExtension(phone: string): string {
  return phone.split(/(?:доб|доп|ext|x|#)\.?\s*\d+\s*$/i)[0]
}

/** Только цифры номера; российское «8XXXXXXXXXX» приводим к международному «7…». */
export function phoneDigits(phone: string): string {
  const digits = stripExtension(phone).replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

/** Номер пригоден для мессенджеров (wa.me/t.me требуют полный номер). */
export function isLinkablePhone(phone: string | null | undefined): phone is string {
  return !!phone && phoneDigits(phone).length >= 10
}

/** Номер, по которому можно хотя бы позвонить (городской, короткий — тоже). */
export function isCallablePhone(phone: string | null | undefined): phone is string {
  return !!phone && phoneDigits(phone).length >= 5
}

/**
 * tel: в формате E.164 — с «+» для полноценных номеров. Без плюса номер,
 * начинающийся с 7, часть дозвонщиков понимает как национальный и отвечает
 * «Неверный номер»: дефект проскакивал, потому что для введённых с «+7»
 * ссылка работала.
 */
export function telHref(phone: string): string {
  const digits = phoneDigits(phone)
  return digits.length >= 11 ? `tel:+${digits}` : `tel:${digits}`
}

export function waHref(phone: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

export function tgHref(phone: string): string {
  return `https://t.me/+${phoneDigits(phone)}`
}

/**
 * Подходит ли номер под поисковый запрос.
 *
 * Сравниваем варианты номера (полные цифры и последние 10) с вариантами
 * запроса (как есть и без ведущей 8/7) — так «8999», «999» и «+7 999…»
 * означают одно и то же. Запрос с буквами телефоном не считается: иначе
 * «дима 5» выдавал ВСЕХ, у кого в номере есть цифра 5, и уточнение запроса
 * расширяло список. Минимум три цифры — по одной-двум искать бессмысленно.
 */
export function phoneMatches(phone: string | null | undefined, query: string): boolean {
  if (!phone) return false
  if (/[a-zA-Zа-яА-Я]/.test(query)) return false
  const q = query.replace(/\D/g, '')
  if (q.length < 3) return false

  const digits = phoneDigits(phone)
  const inPhone = [digits, digits.slice(-10)]
  const asked = [q]
  // Ведущая 8/7 — это код страны/междугородний префикс, он не обязан совпадать.
  if (/^[87]/.test(q)) asked.push(q.slice(1))

  return asked.some((a) => a.length >= 3 && inPhone.some((v) => v.includes(a)))
}
