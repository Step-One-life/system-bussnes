import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { isLinkablePhone, waHref } from 'common/utils/phone-links'

import { subLabel } from '../model/subscription-status'

import type { Student, Subscription } from '../model/types'

/**
 * «Напомнить об оплате»: с телефоном — открывает WhatsApp с готовым текстом,
 * без телефона — копирует текст в буфер (отправить любым способом).
 */
export function usePaymentReminder() {
  const { t } = useTranslation()
  const toast = useToast()

  return (student: Pick<Student, 'name' | 'phone'>, sub: Subscription) => {
    const text = t('students.contacts.reminderText', {
      name: student.name,
      sub: subLabel(sub),
    })
    if (isLinkablePhone(student.phone)) {
      window.open(waHref(student.phone, text), '_blank', 'noopener')
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
