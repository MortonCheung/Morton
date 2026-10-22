import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/** Track an element's CSS box. Drives camera framing + the SVG projection. */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const rect = el.getBoundingClientRect()
      setSize((prev) =>
        prev && Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height },
      )
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Pause the render loop while the tab is hidden — no wasted RAF / GPU work. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

/** Normalised pointer (-1..1), read by the scene without React re-renders. */
export function usePointer(ref: RefObject<HTMLElement | null>) {
  const [value] = useState(() => ({ x: 0, y: 0, tx: 0, ty: 0 }))
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      value.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      value.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1
    }
    const onLeave = () => {
      value.tx = 0
      value.ty = 0
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [ref, value])
  return value
}
