import type { KeyboardEvent } from 'react'

/**
 * Пропсы для div-а, который ведёт себя как кнопка.
 *
 * Карточки ученика, группы, финзаписи, занятия и предупреждений были обычными
 * div с onClick: фокус на них не вставал, Enter и пробел не работали, и с
 * клавиатуры основное действие списков было недостижимо.
 */
export function useClickable(onClick?: () => void) {
  if (!onClick) return {}
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
  }
}
