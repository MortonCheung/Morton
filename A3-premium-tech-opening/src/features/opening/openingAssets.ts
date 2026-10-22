import { useEffect, useState } from 'react'
import { mark } from '../../lib/timeline'

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

export function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/** Load the licensed TTF once. Both WebGL outlines and the UI font use it. */
export function useFontBuffer(url: string) {
  const [state, setState] = useState<{ data: ArrayBuffer | null; error: string | null }>({
    data: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    fetch(url, { signal: controller.signal, cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
        return response.arrayBuffer()
      })
      .then((buffer) => {
        if (cancelled) return
        mark('fontAt')
        setState({ data: buffer, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) return
        // A read failure is surfaced, not hidden: the app switches to the DOM fallback.
        console.warn('[morton] licensed font failed to load, using CSS fallback:', error)
        setState({ data: null, error: String(error) })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [url])

  return state
}

/**
 * QA hook only: `?delayAsset=1500` holds the *environment* readiness promise for
 * an extra 1500ms so the "built state waits for real assets" path can be tested
 * without throttling the network. It never fabricates progress; the drawing gate
 * still waits for real work, and the default build has no delay at all.
 */
export function readAssetDelay(): number {
  if (typeof window === 'undefined') return 0
  const value = Number(new URLSearchParams(window.location.search).get('delayAsset') ?? 0)
  return Number.isFinite(value) && value > 0 ? Math.min(8000, value) : 0
}
