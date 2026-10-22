import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import { createDrawTimeline } from '../animation/draw'
import { createHeroDrift, createRevealTimeline } from '../animation/reveal'
import { mark, setExtra, setLetters, setState } from '../lib/timeline'
import { loadFontBuffer, sleep, waitForUiFont } from '../lib/assets'
import { readQaFlags } from '../lib/qa'
import { OUTLINE } from '../data/outline.generated'
import { OpeningScene } from '../scenes/OpeningScene'
import { computeFrame, overlayTransform } from '../scenes/framing'
import { getQualityTier } from '../scenes/quality'
import type { OpeningPhase, RunTimings } from '../types/opening'

export interface OpeningRefs {
  stage: RefObject<HTMLElement | null>
  canvas: RefObject<HTMLCanvasElement | null>
  outline: RefObject<SVGSVGElement | null>
  progress: RefObject<HTMLElement | null>
}

export interface OpeningResult {
  phase: OpeningPhase
  reducedMotion: boolean
  error: string | null
  replay: () => void
}

const round = (n: number) => Math.round(n)

/** floor for the observed drawing phase (acceptance: >= 1000 ms) */
const MIN_DRAW_MS = 1050

/**
 * Orchestrates one opening run: real asset gate, minimum drawing time, reveal,
 * hero, replay, visibility pausing and probe reporting.
 *
 * The gate is intentionally `Promise.all([draw, assets])` where `draw` is the
 * actual GSAP completion callback and `assets` resolves only after the TTF has
 * been fetched, parsed, extruded, uploaded and shader-compiled. Nothing is
 * synthesised: a fast asset load cannot shorten the drawing, and a slow one
 * parks the page in the completed built state.
 */
export function useOpening(refs: OpeningRefs): OpeningResult {
  const [phase, setPhase] = useState<OpeningPhase>('loading')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const replayRef = useRef<() => void>(() => {})

  useEffect(() => {
    const stage = refs.stage.current
    const canvas = refs.canvas.current
    const svg = refs.outline.current
    if (!stage || !canvas || !svg) return

    let cancelled = false
    const qa = readQaFlags()
    const reduced = qa.forceReduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(reduced)

    const quality = getQualityTier(stage.clientWidth || window.innerWidth, window.devicePixelRatio)
    const frameGroup = svg.querySelector<SVGGElement>('[data-outline-frame]')
    const inkGroup = svg.querySelector<SVGGElement>('[data-outline-ink]')

    // ------------------------------------------------------------- scene
    let scene: OpeningScene | null = null
    try {
      scene = new OpeningScene(canvas, quality)
      scene.start()
    } catch (cause) {
      console.warn('[A1] WebGL scene unavailable', cause)
      setError('WEBGL_UNAVAILABLE')
    }
    const activeScene = scene

    // ------------------------------------------------------------- layout
    const relayout = () => {
      if (cancelled) return
      const width = Math.max(stage.clientWidth, 1)
      const height = Math.max(stage.clientHeight, 1)
      activeScene?.resize()
      const t = overlayTransform(computeFrame(width, height))
      svg.setAttribute('viewBox', `0 0 ${t.width} ${t.height}`)
      svg.style.setProperty('--outline-stroke', `${(1.4 / t.k).toFixed(5)}`)
      frameGroup?.setAttribute(
        'transform',
        `translate(${t.width / 2} ${t.height / 2}) scale(${t.k} ${-t.k}) translate(0 ${t.d})`,
      )
    }
    relayout()
    const observer = new ResizeObserver(relayout)
    observer.observe(stage)

    // ------------------------------------------------------------- probe
    setExtra({
      quality,
      reducedMotion: reduced,
      qa: { assetDelayMs: qa.assetDelayMs, freeze: qa.freeze },
      word: { width: OUTLINE.width, letters: OUTLINE.letters.length, ink: OUTLINE.ink },
    })

    const timers = { stats: 0 }
    const runs: RunTimings[] = []
    let assetsPromise: Promise<boolean> | null = null
    let timelineDraw: gsap.core.Timeline | null = null
    let timelineReveal: gsap.core.Timeline | null = null
    let timelineDrift: gsap.core.Timeline | null = null
    let runId = 0
    let runToken = 0
    const run: Partial<RunTimings> = {}

    const killTimelines = () => {
      timelineDraw?.kill()
      timelineReveal?.kill()
      timelineDrift?.kill()
      timelineDraw = timelineReveal = timelineDrift = null
      if (activeScene) {
        gsap.killTweensOf(activeScene.motion)
        for (const slot of activeScene.motion.reveal) gsap.killTweensOf(slot)
        gsap.killTweensOf(activeScene.letterMaterial)
      }
      if (inkGroup) gsap.killTweensOf(inkGroup)
      if (refs.progress.current) gsap.killTweensOf(refs.progress.current)
    }

    const refreshLetters = () => {
      if (!activeScene) return
      const snapshot = activeScene.snapshotLetters()
      setLetters(
        snapshot.map((letter) => ({
          id: letter.id,
          position: letter.position,
          rotation: letter.rotation,
          visible: letter.visible,
        })),
      )
      const ids = snapshot.map((letter) => letter.geometryId)
      const oIds = snapshot.filter((letter) => letter.char === 'O').map((letter) => letter.geometryId)
      setExtra({
        geometry: {
          meshes: snapshot.length,
          uniqueGeometries: new Set(ids).size,
          sharedOGeometry: oIds.length === 2 && oIds[0] === oIds[1],
          layoutMatch: activeScene.getLayoutMatch(),
        },
      })
    }

    // ------------------------------------------------------------- assets
    const ensureAssets = (): Promise<boolean> => {
      if (assetsPromise) return assetsPromise
      if (!activeScene) {
        assetsPromise = Promise.resolve(false)
        return assetsPromise
      }
      assetsPromise = (async () => {
        try {
          const load = async () => {
            const started = performance.now()
            const buffer = await (async () => {
              try {
                return await loadFontBuffer({ delayMs: qa.assetDelayMs })
              } catch (first) {
                console.warn('[A1] font fetch failed, retrying once', first)
                return await loadFontBuffer({})
              }
            })()
            await sleep(qa.assetDelayMs > 0 ? qa.assetDelayMs * 0.5 : 0)
            await waitForUiFont()
            const fontReady = performance.now()
            const cost = await activeScene.loadLetters(buffer, quality)
            mark('fontBytes', buffer.byteLength)
            mark('fontFetchMs', round(fontReady - started))
            mark('geometryBuildMs', round(cost.parseMs))
            mark('shaderCompileMs', round(cost.compileMs))
            mark('assetsReadyMs', round(performance.now() - started))
            return true
          }
          const ok = await load()
          if (ok) {
            setError(null)
            refreshLetters()
            mark('readyAt', round(performance.now()))
          }
          return ok
        } catch (cause) {
          console.warn('[A1] critical assets failed', cause)
          setError('ASSETS')
          assetsPromise = null
          return false
        }
      })()
      return assetsPromise
    }

    const pushRun = () => {
      const entry: RunTimings = {
        run: run.run ?? 0,
        drawingAt: round(run.drawingAt ?? 0),
        builtAt: round(run.builtAt ?? 0),
        expandingAt: round(run.expandingAt ?? 0),
        heroAt: round(run.heroAt ?? 0),
        drawMs: round((run.builtAt ?? 0) - (run.drawingAt ?? 0)),
        expandMs: round((run.heroAt ?? 0) - (run.expandingAt ?? 0)),
        totalMs: round((run.heroAt ?? 0) - (run.drawingAt ?? 0)),
      }
      runs.push(entry)
      mark('drawMs', entry.drawMs)
      mark('expandMs', entry.expandMs)
      mark('totalMs', entry.totalMs)
      setExtra({ runs: [...runs], lastRun: entry })
    }

    // ------------------------------------------------------------- expand
    const startExpand = () => {
      if (!activeScene || cancelled) return
      const token = runToken
      run.expandingAt = performance.now()
      setState('expanding')
      setPhase('expanding')
      refreshLetters()

      timelineReveal = createRevealTimeline({
        scene: activeScene,
        outlineInk: inkGroup,
        progressEl: refs.progress.current,
        onComplete: () => {
          if (cancelled || token !== runToken) return
          run.heroAt = performance.now()
          setState('hero')
          setPhase('hero')
          refreshLetters()
          pushRun()
          activeScene.setIdle(!reduced)
          timelineDrift = createHeroDrift(activeScene)
        },
      })
      if (qa.freeze === 'mid') timelineReveal.progress(0.55).pause()
      if (qa.freeze === 'handoff') timelineReveal.progress(0.12).pause()
    }

    // ------------------------------------------------------------- run
    const startRun = () => {
      if (!activeScene || cancelled) return
      runToken += 1
      const token = runToken
      runId += 1
      killTimelines()
      activeScene.resetForReplay()
      if (inkGroup) gsap.set(inkGroup, { opacity: 1 })
      if (refs.progress.current) gsap.set(refs.progress.current, { scaleX: 0, opacity: 1 })
      Object.assign(run, {
        run: runId,
        drawingAt: performance.now(),
        builtAt: 0,
        expandingAt: 0,
        heroAt: 0,
      })

      if (reduced) {
        for (const path of Array.from(svg.querySelectorAll<SVGPathElement>('path'))) {
          const length = path.getTotalLength()
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0, opacity: 1 })
        }
        setPhase('loading')
        ensureAssets().then((ok) => {
          if (cancelled || token !== runToken) return
          if (!ok) {
            setPhase('built')
            return
          }
          activeScene.applyHeroNow()
          run.heroAt = performance.now()
          run.builtAt = run.heroAt
          run.expandingAt = run.heroAt
          setState('reduced')
          setPhase('reduced')
          refreshLetters()
          pushRun()
        })
        return
      }

      setState('drawing')
      setPhase('drawing')
      refreshLetters()

      const drawStarted = performance.now()
      const drawDone = new Promise<void>((resolve) => {
        const handle = createDrawTimeline(svg, refs.progress.current, () => {
          // Guarantee the *observed* drawing phase is at least 1050 ms even if
          // GSAP's first tick lands late (its clock can run a few frames ahead
          // of performance.now() right after mount). The lines are complete
          // during the remaining hold, so nothing is skipped visually.
          const elapsed = performance.now() - drawStarted
          const remaining = MIN_DRAW_MS - elapsed
          if (remaining > 0) window.setTimeout(resolve, remaining)
          else resolve()
        })
        timelineDraw = handle.timeline
        mark('drawPlannedMs', round(handle.duration * 1000))
      })

      drawDone.then(() => {
        if (cancelled || token !== runToken) return
        run.builtAt = performance.now()
        setState('built')
        setPhase('built')
        refreshLetters()
        mark('drawMs', round((run.builtAt ?? 0) - (run.drawingAt ?? 0)))
      })

      Promise.all([drawDone, ensureAssets()]).then(([, ready]) => {
        if (cancelled || token !== runToken) return
        if (!ready) {
          setError('ASSETS')
          return
        }
        if (qa.freeze === 'built') return
        startExpand()
      })
    }

    // ------------------------------------------------------------- stats + visibility
    timers.stats = window.setInterval(() => {
      if (!activeScene || cancelled) return
      setExtra({ renderer: activeScene.getStats() })
    }, 1000)

    let pausedDraw = false
    let pausedReveal = false
    let pausedDrift = false
    let scenePaused = false
    const onVisibility = () => {
      if (document.hidden) {
        scenePaused = activeScene ? !activeScene.isRunning() : false
        if (scenePaused) activeScene?.pause()
        pausedDraw = Boolean(timelineDraw && !timelineDraw.paused())
        pausedReveal = Boolean(timelineReveal && !timelineReveal.paused())
        pausedDrift = Boolean(timelineDrift && !timelineDrift.paused())
        if (pausedDraw) timelineDraw?.pause()
        if (pausedReveal) timelineReveal?.pause()
        if (pausedDrift) timelineDrift?.pause()
      } else {
        if (scenePaused) {
          activeScene?.resume()
          scenePaused = false
        }
        if (pausedDraw) timelineDraw?.resume()
        if (pausedReveal) timelineReveal?.resume()
        if (pausedDrift) timelineDrift?.resume()
        pausedDraw = pausedReveal = pausedDrift = false
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'r' || event.key === 'R') {
        const target = event.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        event.preventDefault()
        startRun()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    replayRef.current = startRun

    // QA-only control surface (never installed without ?debug=1)
    if (qa.debug && activeScene) {
      window.__MORTON_DEBUG__ = {
        nudgeLetter: (id: string, rotation: [number, number, number]) => {
          const ok = activeScene!.nudgeLetter(id, rotation)
          refreshLetters()
          return ok
        },
        letters: () => activeScene!.snapshotLetters(),
        stats: () => activeScene!.getStats(),
        replay: startRun,
      }
      const onUnload = () => {
        delete window.__MORTON_DEBUG__
      }
      window.addEventListener('pagehide', onUnload)
    }

    startRun()

    return () => {
      cancelled = true
      runToken += 1
      observer.disconnect()
      window.clearInterval(timers.stats)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('keydown', onKeyDown)
      killTimelines()
      if (inkGroup) gsap.killTweensOf(inkGroup)
      if (refs.progress.current) gsap.killTweensOf(refs.progress.current)
      activeScene?.dispose()
      assetsPromise = null
      replayRef.current = () => {}
    }
    // refs are stable objects; the effect intentionally runs once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const replay = useCallback(() => replayRef.current(), [])

  return { phase, reducedMotion, error, replay }
}
