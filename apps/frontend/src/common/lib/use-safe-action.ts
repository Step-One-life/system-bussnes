import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'

/**
 * Запуск действия, итог которого обязан быть виден. Отказ сервера превращается
 * в тост с текстом ошибки, а не в тихий unhandled rejection: раньше списание
 * занятия, удаление абонемента и удаление ученика при 409/500/обрыве сети
 * не показывали ничего, и тренер жал повторно, не зная, учтены ли деньги.
 *
 * Возвращает undefined, если действие упало — вызывающий код может на это
 * опереться (например, не закрывать шторку).
 */
export function useSafeAction() {
  const { t } = useTranslation()
  const toast = useToast()

  return async function run<T>(
    action: () => Promise<T>,
    opts?: { success?: string; successMsg?: string },
  ): Promise<T | undefined> {
    try {
      const result = await action()
      if (opts?.success) {
        toast({ type: 'success', title: opts.success, msg: opts.successMsg })
      }
      return result
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
      return undefined
    }
  }
}
