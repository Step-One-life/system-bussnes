import { useCallback, useEffect } from 'react'

import { Modal } from 'antd'

import { useBlocker } from 'react-router-dom'

interface UseUnsavedFormGuardOptions {
  /** Текущая «грязность» формы — есть ли несохранённые изменения. */
  isDirty: boolean
  confirmTitle: string
  confirmContent: string
  okText: string
  cancelText: string
}

interface UseUnsavedFormGuardResult {
  /**
   * Вызвать вместо обычного onClose: если форма грязная — спросит
   * подтверждение, иначе сразу выполнит переданный колбэк.
   */
  confirmClose: (onProceed: () => void) => void
}

/**
 * Защищает форму от потери введённых данных:
 *  - блокирует SPA-навигацию через react-router blocker и просит подтверждение;
 *  - вешает beforeunload на закрытие/перезагрузку вкладки;
 *  - предоставляет confirmClose для безопасного закрытия модалки.
 */
export function useUnsavedFormGuard({
  isDirty,
  confirmTitle,
  confirmContent,
  okText,
  cancelText,
}: UseUnsavedFormGuardOptions): UseUnsavedFormGuardResult {
  // Блокируем переходы между маршрутами SPA, пока есть несохранённые данные.
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    Modal.confirm({
      title: confirmTitle,
      content: confirmContent,
      okText,
      cancelText,
      okButtonProps: { danger: true },
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    })
  }, [blocker, confirmTitle, confirmContent, okText, cancelText])

  // Спрашиваем подтверждение при полном уходе со страницы (закрытие вкладки,
  // перезагрузка, ввод другого URL).
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Современные браузеры игнорируют возвращаемое сообщение, но всё равно
      // показывают стандартный диалог при non-undefined returnValue.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const confirmClose = useCallback(
    (onProceed: () => void) => {
      if (!isDirty) {
        onProceed()
        return
      }
      Modal.confirm({
        title: confirmTitle,
        content: confirmContent,
        okText,
        cancelText,
        okButtonProps: { danger: true },
        onOk: () => onProceed(),
      })
    },
    [isDirty, confirmTitle, confirmContent, okText, cancelText],
  )

  return { confirmClose }
}
