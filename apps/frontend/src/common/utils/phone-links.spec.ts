import {
  isCallablePhone,
  isLinkablePhone,
  phoneDigits,
  phoneMatches,
  telHref,
  tgHref,
  waHref,
} from './phone-links'

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

  it('отрезает добавочный — раньше он приклеивался к номеру', () => {
    expect(phoneDigits('+7 999 123-45-67 доб. 101')).toBe('79991234567')
    expect(phoneDigits('+7 999 123-45-67 ext 5')).toBe('79991234567')
    expect(phoneDigits('+7 999 123-45-67 #12')).toBe('79991234567')
  })
})

describe('isLinkablePhone / isCallablePhone', () => {
  it('мессенджеры требуют полный номер', () => {
    expect(isLinkablePhone('+7 999 123-45-67')).toBe(true)
    expect(isLinkablePhone('123-45-67')).toBe(false)
    expect(isLinkablePhone(null)).toBe(false)
  })

  it('позвонить можно и на короткий городской — кнопка не должна пропадать', () => {
    expect(isCallablePhone('123-45-67')).toBe(true)
    expect(isCallablePhone('112')).toBe(false)
    expect(isCallablePhone(undefined)).toBe(false)
  })
})

describe('telHref', () => {
  // D22: без «+» номер, начинающийся с 7, часть дозвонщиков считает национальным.
  it('полный номер уходит в E.164 с плюсом', () => {
    expect(telHref('+7 (999) 123-45-67')).toBe('tel:+79991234567')
    expect(telHref('8 999 123-45-67')).toBe('tel:+79991234567')
  })

  it('короткий городской остаётся как есть', () => {
    expect(telHref('123-45-67')).toBe('tel:1234567')
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

// D23: поиск по номеру не находил «8999» и расширял выдачу на «дима 5».
describe('phoneMatches', () => {
  const PHONE = '+7 999 123-45-67'

  it('находит по началу номера в другом формате', () => {
    expect(phoneMatches(PHONE, '8999')).toBe(true)
    expect(phoneMatches(PHONE, '999')).toBe(true)
    expect(phoneMatches(PHONE, '1234567')).toBe(true)
  })

  it('запрос с буквами телефоном не считается', () => {
    expect(phoneMatches(PHONE, 'дима 5')).toBe(false)
    expect(phoneMatches(PHONE, 'Анна')).toBe(false)
  })

  it('меньше трёх цифр не ищет — иначе «5» выдавала бы всех', () => {
    expect(phoneMatches(PHONE, '5')).toBe(false)
    expect(phoneMatches(PHONE, '99')).toBe(false)
  })

  it('чужой номер не совпадает', () => {
    expect(phoneMatches(PHONE, '888')).toBe(false)
  })

  it('пустой телефон не совпадает ни с чем', () => {
    expect(phoneMatches(null, '999')).toBe(false)
  })
})
