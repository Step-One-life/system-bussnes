import { Button } from 'antd'
import { PhoneOutlined, SendOutlined, WhatsAppOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { isLinkablePhone, telHref, tgHref, waHref } from 'common/utils/phone-links'

interface ContactActionsProps {
  phone: string | null | undefined
  /** Текст, который подставится в WhatsApp (например, напоминание об оплате). */
  waText?: string
}

/** Кнопки связи с учеником: звонок, WhatsApp, Telegram. Без номера — ничего. */
export function ContactActions({ phone, waText }: ContactActionsProps) {
  const { t } = useTranslation()
  if (!isLinkablePhone(phone)) return null
  return (
    <div className="contact-actions">
      <Button size="small" icon={<PhoneOutlined />} href={telHref(phone)}>
        {t('students.contacts.call')}
      </Button>
      <Button
        size="small"
        icon={<WhatsAppOutlined />}
        href={waHref(phone, waText)}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </Button>
      <Button
        size="small"
        icon={<SendOutlined />}
        href={tgHref(phone)}
        target="_blank"
        rel="noreferrer"
      >
        Telegram
      </Button>
    </div>
  )
}
