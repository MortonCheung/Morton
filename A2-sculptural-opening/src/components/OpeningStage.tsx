import { useEffect, useRef } from 'react'
import { SculptureScene } from '../scenes/SculptureScene'
import type { OpeningState } from '../lib/timeline'

export interface StageApi {
  replay: () => void
}

interface OpeningStageProps {
  onState: (state: OpeningState) => void
  onError: (reason: string) => void
  onReady: (api: StageApi) => void
}

/**
 * React ⇄ Three.js boundary. React owns this host element; SculptureScene owns the canvas.
 * The scene is created exactly once; props are read through a ref so re-renders never
 * recreate the WebGL context.
 */
export function OpeningStage({ onState, onError, onReady }: OpeningStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onState, onError, onReady })
  callbacks.current = { onState, onError, onReady }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scene: SculptureScene | null = null

    try {
      scene = new SculptureScene(host, {
        reducedMotion,
        onState: (next) => callbacks.current.onState(next),
        onError: (reason) => callbacks.current.onError(reason),
      })
      const current = scene
      callbacks.current.onReady({ replay: () => current.replay() })
    } catch (err) {
      console.error('[A2] failed to initialise the WebGL scene', err)
      callbacks.current.onError('WEBGL_INIT_FAILED')
    }

    return () => {
      scene?.dispose()
    }
  }, [])

  return <div className="stage" ref={hostRef} data-morton-stage aria-busy="false" />
}
