import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { tgHref } from 'common/utils/phone-links'

/**
 * Написать ученику в Telegram по номеру: чат открывается диплинком, а текст
 * кладётся в буфер (t.me, в отличие от wa.me, не умеет предзаполнять
 * сообщение). Окно открываем синхронно — после await клика попап-блокер
 * успевает съесть user gesture.
 */
export function useTelegramMessage() {
  const { t } = useTranslation()
  const toast = useToast()

  return (phone: string, text: string) => {
    window.open(tgHref(phone), '_blank', 'noopener')
    navigator.clipboard.writeText(text).then(
      () =>
        toast({
          type: 'success',
          title: t('common.tgCopied'),
          msg: t('common.tgCopiedHint'),
        }),
      () => toast({ type: 'error', title: t('common.error') }),
    )
  }
}
