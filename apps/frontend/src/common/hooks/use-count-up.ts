import { useEffect, useRef, useState } from 'react'

/**
 * Анимация числа до целевого значения.
 *
 * Показываемое значение — `animated ?? target`, то есть настоящая цифра по
 * умолчанию, а анимация лишь временно её подменяет. Раньше хук стартовал с
 * нуля и жил только через requestAnimationFrame: если кадры не идут (вкладка
 * в фоне, throttling, отключённая анимация), плитка показывала 0 при живых
 * данных — рядом с индикатором проблемы, нарисованным по РЕАЛЬНОМУ значению.
 * Плюс любое обновление данных роняло число в 0 и накручивало заново.
 */
export function useCountUp(target: number, duration = 600): number {
  const [animated, setAnimated] = useState<number | null>(null)
  // Последнее показанное значение: анимируем ОТ него, а не от нуля.
  const shownRef = useRef(0)

  useEffect(() => {
    const from = shownRef.current
    if (!Number.isFinite(target) || from === target) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Кадров не будет (скрытая вкладка) или анимация не нужна — сразу правда.
    if (reduced || (typeof document !== 'undefined' && document.hidden)) {
      shownRef.current = target
      return
    }

    let raf = 0
    let start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const value = Math.round(from + (target - from) * progress)
      shownRef.current = value
      // setState внутри rAF-колбэка асинхронный, не в теле эффекта.
      setAnimated(value)
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        shownRef.current = target
        setAnimated(null)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return animated ?? target
}
