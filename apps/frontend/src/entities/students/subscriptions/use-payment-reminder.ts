import { useTranslation } from 'react-i18next'

import { useTelegramMessage } from 'common/hooks/use-telegram-message'
import { useToast } from 'common/ui'
import { copyText } from 'common/utils/clipboard'
import { isLinkablePhone } from 'common/utils/phone-links'

import { subLabel } from '../model/subscription-status'

import type { Student, Subscription } from '../model/types'

/**
 * «Напомнить об оплате». С полным номером — чат Telegram плюс текст в буфер;
 * без него — только текст. Отказ буфера показываем честно: сам текст в тосте,
 * чтобы его можно было выделить, а не абстрактное «Ошибка».
 */
export function usePaymentReminder() {
  const { t } = useTranslation()
  const toast = useToast()
  const sendTelegram = useTelegramMessage()

  return async (student: Pick<Student, 'name' | 'phone'>, sub: Subscription) => {
    const text = t('students.contacts.reminderText', {
      name: student.name,
      sub: subLabel(sub),
    })
    if (isLinkablePhone(student.phone)) {
      await sendTelegram(student.phone, text)
      return
    }
    const copied = await copyText(text)
    toast(
      copied
        ? {
            type: 'success',
            title: t('students.contacts.copied'),
            // Номера нет ИЛИ он неполный — подсказка не должна врать «не указан».
            msg: student.phone
              ? t('students.contacts.copiedHintShort')
              : t('students.contacts.copiedHint'),
          }
        : { type: 'warn', title: t('common.tgCopyFailed'), msg: text },
    )
  }
}
