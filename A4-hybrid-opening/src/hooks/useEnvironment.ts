import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export interface Viewport {
  width: number
  height: number
}

/** Layout viewport, coalesced to a single update per frame. */
export function useViewport(): Viewport {
  const [size, setSize] = useState<Viewport>(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }))

  useEffect(() => {
    let frame = 0
    let last = size
    const measure = () => {
      frame = 0
      const next = { width: window.innerWidth, height: window.innerHeight }
      if (next.width === last.width && next.height === last.height) return
      last = next
      setSize(next)
    }
    const onResize = () => {
      if (frame) return
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return size
}
