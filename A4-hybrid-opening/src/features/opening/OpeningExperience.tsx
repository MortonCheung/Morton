import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandChrome } from '../../components/BrandChrome'
import { createLetterAssets } from '../../letters/letterAssets'
import { loadWordModel, type WordModel } from '../../lib/fontLoader'
import { OPENING } from '../../lib/openingConfig'
import { mark, setExtra, setState, type OpeningState } from '../../lib/timeline'
import { usePrefersReducedMotion, useViewport } from '../../hooks/useEnvironment'
import { createStage, type OutlineTarget, type SceneApi, type StageRuntime } from './stage'
import { OutlineStage } from './OutlineStage'
import { useOpeningSequence } from './useOpeningSequence'
import { OpeningCanvas } from '../../scenes/OpeningCanvas'
import { computeCameraLayout } from '../../scenes/cameraLayout'

/**
 * Opening feature shell. Owns the typeface lifecycle, the viewport layout and
 * the state machine wiring; the heavy lifting lives in the scene, the outline
 * overlay and animation modules.
 */
export function OpeningExperience() {
  const reduced = usePrefersReducedMotion()
  const viewport = useViewport()
  const stageRef = useInitialStage()

  const [model, setModel] = useState<WordModel | null>(null)
  const [fontError, setFontError] = useState<string | null>(null)
  const [outline, setOutline] = useState<OutlineTarget | null>(null)
  const [scene, setScene] = useState<SceneApi | null>(null)
  const [phase, setPhase] = useState<OpeningState>('loading')
  const [pump, setPump] = useState(true)
  const [runId, setRunId] = useState(0)

  // Resolves when the WebGL scene is mounted; part of the real expand gate.
  const sceneGate = useMemo(() => {
    let resolve!: () => void
    const promise = new Promise<void>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }, [])

  // One geometry/material owner for the whole opening; disposed exactly once.
  const assets = useMemo(() => (model ? createLetterAssets(model.build) : null), [model])
  useEffect(() => () => assets?.dispose(), [assets])

  useEffect(() => {
    let alive = true
    loadWordModel()
      .then((loaded) => {
        if (alive) setModel(loaded)
      })
      .catch((error: unknown) => {
        if (!alive) return
        const message = error instanceof Error ? error.message : String(error)
        // Readable fallback: the page never stays on a silent loading state.
        setFontError(message)
        setState('reduced')
        setExtra({ fontError: message })
        setPhase('reduced')
      })
    return () => {
      alive = false
    }
  }, [])

  const isMobile = viewport.width < 640
  const layout = useMemo(
    () =>
      model
        ? computeCameraLayout(
            viewport.width,
            viewport.height,
            model.build.width,
            OPENING.startZ,
            OPENING.depth,
          )
        : null,
    [model, viewport.width, viewport.height],
  )

  useEffect(() => {
    if (layout && scene) scene.invalidate()
  }, [layout, scene])

  const handleOutline = useCallback(
    (target: OutlineTarget | null) => {
      if (target) mark('outlineReadyAt')
      setOutline(target)
    },
    [],
  )
  const handleScene = useCallback(
    (api: SceneApi | null) => {
      setScene(api)
      if (api) {
        mark('sceneReadyAt')
        sceneGate.resolve()
      }
    },
    [sceneGate],
  )
  const handlePhase = useCallback((next: OpeningState) => setPhase(next), [])
  const handlePump = useCallback((active: boolean) => setPump(active), [])
  const replay = useCallback(() => setRunId((id) => id + 1), [])

  useOpeningSequence({
    assets,
    stage: stageRef,
    outline,
    sceneReady: sceneGate.promise,
    reduced,
    runId,
    onPhase: handlePhase,
    setPump: handlePump,
  })

  return (
    <main
      className="stage"
      data-morton-root
      data-state={fontError ? 'reduced' : phase}
      data-reduced={reduced ? 'true' : undefined}
    >
      <div className="stage__backdrop" aria-hidden="true" />
      <div className="stage__floor" aria-hidden="true" />
      <div className="stage__reflection" aria-hidden="true" />
      <div className="stage__vignette" aria-hidden="true" />

      {assets && layout ? (
        <div className="stage__canvas-wrap">
          <OpeningCanvas
            stage={stageRef}
            assets={assets}
            layout={layout}
            isMobile={isMobile}
            pump={pump}
            onReady={handleScene}
          />
        </div>
      ) : null}

      {model ? (
        <OutlineStage
          letters={model.build.letters}
          capHeight={model.build.capHeight}
          stage={stageRef}
          layout={layout}
          viewport={viewport}
          onReady={handleOutline}
        />
      ) : null}

      {fontError ? (
        <div className="fallback" role="alert">
          <span className="fallback__word">MORTON</span>
          <em>Typeface unavailable — static fallback.</em>
        </div>
      ) : null}

      <BrandChrome phase={fontError ? 'reduced' : phase} onReplay={replay} />
      <div className="stage__grain" aria-hidden="true" />
    </main>
  )
}

/** The mutable stage lives for the lifetime of the feature, never in state. */
function useInitialStage(): StageRuntime {
  const [stage] = useState(createStage)
  return stage
}
