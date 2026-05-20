import { useEffect, useState } from 'react'

/** Animates a number from 0 to target over the given duration. */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(target) || target === 0) {
      return
    }
    let raf = 0
    let start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      // setState inside rAF callback runs async, not during effect commit.
       
      setValue(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return target === 0 ? 0 : value
}
