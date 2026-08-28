import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { copyText } from 'common/utils/clipboard'
import { tgHref } from 'common/utils/phone-links'

/**
 * Написать ученику в Telegram по номеру: t.me, в отличие от wa.me, не умеет
 * предзаполнять сообщение, поэтому текст кладём в буфер.
 *
 * ПОРЯДОК ВАЖЕН: сначала копируем, потом открываем чат. Наоборот новая
 * вкладка забирает фокус, и браузер отклоняет запись в буфер («Document is
 * not focused») — тренер получал открытый чат, пустой буфер и красный тост
 * «Ошибка». Если скопировать всё же не удалось (http без TLS), показываем сам
 * текст, чтобы его можно было выделить руками.
 */
export function useTelegramMessage() {
  const { t } = useTranslation()
  const toast = useToast()

  return async (phone: string, text: string) => {
    const copied = await copyText(text)
    window.open(tgHref(phone), '_blank', 'noopener')
    toast(
      copied
        ? { type: 'success', title: t('common.tgCopied'), msg: t('common.tgCopiedHint') }
        : { type: 'warn', title: t('common.tgCopyFailed'), msg: text },
    )
  }
}
