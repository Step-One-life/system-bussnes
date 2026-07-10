import { useTranslation } from 'react-i18next'

import { useTelegramMessage } from 'common/hooks/use-telegram-message'
import { useToast } from 'common/ui'
import { isLinkablePhone } from 'common/utils/phone-links'

import { subLabel } from '../model/subscription-status'

import type { Student, Subscription } from '../model/types'

/**
 * «Напомнить об оплате»: с телефоном — открывает чат Telegram по номеру
 * (текст напоминания ложится в буфер — t.me не умеет предзаполнять сообщение),
 * без телефона — просто копирует текст (отправить любым способом).
 */
export function usePaymentReminder() {
  const { t } = useTranslation()
  const toast = useToast()
  const sendTelegram = useTelegramMessage()

  return (student: Pick<Student, 'name' | 'phone'>, sub: Subscription) => {
    const text = t('students.contacts.reminderText', {
      name: student.name,
      sub: subLabel(sub),
    })
    if (isLinkablePhone(student.phone)) {
      sendTelegram(student.phone, text)
      return
    }
    navigator.clipboard.writeText(text).then(
      () =>
        toast({
          type: 'success',
          title: t('students.contacts.copied'),
          msg: t('students.contacts.copiedHint'),
        }),
      () => toast({ type: 'error', title: t('common.error') }),
    )
  }
}
