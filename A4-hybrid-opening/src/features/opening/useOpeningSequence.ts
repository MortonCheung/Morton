import { useEffect } from 'react'
import type gsap from 'gsap'
import type { LetterAssets } from '../../letters/letterAssets'
import { OPENING } from '../../lib/openingConfig'
import { mark, resetTimings, setExtra, setState, type OpeningState } from '../../lib/timeline'
import {
  applyHeroState,
  buildDrawTimeline,
  buildExpandTimeline,
  resetStage,
} from '../../animation/openingTimelines'
import { applyOutlineProjection, type OutlineTarget, type StageRuntime } from './stage'

interface SequenceArgs {
  assets: LetterAssets | null
  stage: StageRuntime
  outline: OutlineTarget | null
  sceneReady: Promise<void>
  reduced: boolean
  runId: number
  onPhase: (phase: OpeningState) => void
  setPump: (active: boolean) => void
}

/** Test hook: artificially holds the real critical-asset gate. Never fakes progress. */
function gateDelayMs(): number {
  if (typeof window === 'undefined') return 0
  const value = Number(new URLSearchParams(window.location.search).get('gateDelay') ?? '0')
  return Number.isFinite(value) && value > 0 ? value : 0
}

const raf = (cb: FrameRequestCallback) => requestAnimationFrame(cb)
const nextFrames = (count = 1) =>
  new Promise<void>((resolve) => {
    let left = count
    const step = () => {
      left -= 1
      if (left <= 0) resolve()
      else raf(step)
    }
    raf(step)
  })
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function reportDurations(): void {
  const timings = window.__MORTON__?.timings
  if (!timings) return
  const draw = timings.builtAt !== undefined && timings.drawingAt !== undefined ? timings.builtAt - timings.drawingAt : null
  const expand =
    timings.heroAt !== undefined && timings.expandingAt !== undefined ? timings.heroAt - timings.expandingAt : null
  const total = timings.heroAt !== undefined ? timings.heroAt - (timings.mountedAt ?? 0) : null
  const gateWait =
    timings.expandingAt !== undefined && timings.builtAt !== undefined
      ? timings.expandingAt - timings.builtAt
      : null
  setExtra({ durations: { drawMs: draw, expandMs: expand, totalMs: total, gateWaitMs: gateWait } })
}

/**
 * The opening state machine: loading -> drawing -> built -> expanding -> hero.
 *
 * The gate is a genuine Promise.all of the real typeface/first-frames/document
 * fonts, so the expand can never start before the surface actually exists; if
 * the draw finishes first the stage holds in `built`.
 */
export function useOpeningSequence({
  assets,
  stage,
  outline,
  sceneReady,
  reduced,
  runId,
  onPhase,
  setPump,
}: SequenceArgs): void {
  useEffect(() => {
    if (!assets || !outline) return
    let cancelled = false
    let current: gsap.core.Timeline | null = null
    const timers: number[] = []

    resetTimings()
    resetStage(stage, assets)
    onPhase('loading')
    setPump(true)

    const onVisibility = () => {
      if (!current) return
      if (document.hidden) current.pause()
      else current.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const delay = gateDelayMs()
    const criticalReady = (async () => {
      // Real gate: webfonts + a painted frame + the WebGL scene being registered.
      await Promise.all([document.fonts.ready, nextFrames(2), sceneReady])
      if (delay > 0) await wait(delay)
      if (!cancelled) mark('criticalReadyAt')
    })()

    const complete = (tl: gsap.core.Timeline) =>
      new Promise<void>((resolve) => {
        tl.eventCallback('onComplete', () => resolve())
      })

    const run = async () => {
      await nextFrames(2)
      if (cancelled) return

      if (reduced) {
        applyHeroState(stage, assets, assets.endColor)
        stage.scene?.syncProbe()
        setState('reduced')
        onPhase('reduced')
        mark('reducedAt')
        setExtra({ reducedMotion: true, criticalReadyAfterMs: delay || null })
        setPump(false)
        return
      }

      setState('drawing')
      onPhase('drawing')
      const draw = buildDrawTimeline(outline, () => {})
      current = draw
      await complete(draw)
      if (cancelled) return

      setState('built')
      onPhase('built')
      stage.scene?.syncProbe()
      await criticalReady
      if (cancelled) return

      setState('expanding')
      onPhase('expanding')
      const expand = buildExpandTimeline(stage, assets, () => {})
      current = expand
      await complete(expand)
      if (cancelled) return

      applyHeroState(stage, assets, assets.endColor)
      setState('hero')
      onPhase('hero')
      stage.scene?.syncProbe()
      reportDurations()
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          setPump(false)
          setExtra({ renderPaused: true })
        }, OPENING.idleAfterHeroMs),
      )
    }

    run().catch((error) => {
      if (cancelled) return
      const message = error instanceof Error ? error.message : String(error)
      // Never leave the page stuck: expose the failure, fail over to the final state.
      setExtra({ error: message })
      window.console.error('[MORTON] opening sequence failed:', error)
      applyHeroState(stage, assets, assets.endColor)
      stage.scene?.syncProbe()
      setState('hero')
      onPhase('hero')
      setPump(false)
    })

    return () => {
      cancelled = true
      current?.kill()
      for (const timer of timers) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      setPump(false)
    }
  }, [assets, onPhase, outline, reduced, runId, sceneReady, setPump, stage])
}
