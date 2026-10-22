import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/dom'

/** Reads the reduced-motion preference once; a `?motion=reduce` query forces it for testing. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion())
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      if (new URLSearchParams(window.location.search).get('motion')) return
      setReduced(mq.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}
