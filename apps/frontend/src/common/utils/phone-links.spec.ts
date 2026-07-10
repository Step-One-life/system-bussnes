import { isLinkablePhone, phoneDigits, telHref, tgHref, waHref } from './phone-links'

import { describe, expect, it } from 'vitest'

describe('phoneDigits', () => {
  it('оставляет только цифры', () => {
    expect(phoneDigits('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('российскую ведущую 8 приводит к 7', () => {
    expect(phoneDigits('8 999 123-45-67')).toBe('79991234567')
  })

  it('не трогает 8 в коротких и иностранных номерах', () => {
    expect(phoneDigits('812345')).toBe('812345')
    expect(phoneDigits('+48 999 123 45 67')).toBe('489991234567')
  })
})

describe('isLinkablePhone', () => {
  it('true для полного номера, false для пустого/короткого', () => {
    expect(isLinkablePhone('+7 999 123-45-67')).toBe(true)
    expect(isLinkablePhone('123-45-67')).toBe(false)
    expect(isLinkablePhone('')).toBe(false)
    expect(isLinkablePhone(null)).toBe(false)
    expect(isLinkablePhone(undefined)).toBe(false)
  })
})

describe('telHref', () => {
  it('сохраняет ведущий плюс и чистит разделители', () => {
    expect(telHref('+7 (999) 123-45-67')).toBe('tel:+79991234567')
  })

  it('без плюса использует нормализованные цифры (8 → 7)', () => {
    expect(telHref('8 999 123-45-67')).toBe('tel:79991234567')
  })
})

describe('waHref / tgHref', () => {
  it('строит ссылки из цифр номера', () => {
    expect(waHref('+7 999 123-45-67')).toBe('https://wa.me/79991234567')
    expect(tgHref('8 999 123-45-67')).toBe('https://t.me/+79991234567')
  })

  it('waHref кодирует текст сообщения', () => {
    expect(waHref('+7 999 123-45-67', 'Привет, оплата')).toBe(
      'https://wa.me/79991234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%2C%20%D0%BE%D0%BF%D0%BB%D0%B0%D1%82%D0%B0',
    )
  })
})
