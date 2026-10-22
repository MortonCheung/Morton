import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Backdrop } from '../components/Backdrop'
import { Chrome } from '../components/Chrome'
import { FallbackWordmark } from '../components/FallbackWordmark'
import { OutlineOverlay } from '../components/OutlineOverlay'
import { ShadowLayer } from '../components/ShadowLayer'
import { buildWord, disposeWord } from '../letters/buildWord'
import { useElementSize, usePageVisible, usePointer, useReducedMotion } from '../lib/dom'
import { computeFrame } from '../lib/frame'
import { installProbe, mark, setExtra, setLetters, setState } from '../lib/timeline'
import { OpeningScene, type SceneApi } from '../scenes/OpeningScene'
import { buildDrawPaths, buildShadowPaths } from '../features/opening/svgPaths'
import { createDeferred, readAssetDelay, useFontBuffer } from '../features/opening/openingAssets'
import { useOpeningSequence } from '../features/opening/useOpeningSequence'

// Probe must exist before any effect runs (automated checks read it).
installProbe()

const FONT_URL = './fonts/jost-morton-medium.ttf'
const WORD = 'MORTON'

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const sceneRef = useRef<SceneApi>(null)
  const size = useElementSize(stageRef)
  const reduced = useReducedMotion()
  const pageVisible = usePageVisible()
  const pointer = usePointer(stageRef)
  const { data: fontData, error: fontError } = useFontBuffer(FONT_URL)
  const [fallback, setFallback] = useState(false)

  const build = useMemo(
    () =>
      fontData
        ? buildWord(fontData, WORD, {
            depth: 0.3,
            bevel: 0.024,
            bevelSegments: 7,
            curveSegments: 24,
            trackingEm: 0.075,
            capHeight: 1,
            kerningEm: { 'RT': -0.006 },
          })
        : null,
    [fontData],
  )

  const frame = useMemo(() => (size && build ? computeFrame(size.w, size.h, build.bounds) : null), [size, build])
  const paths = useMemo(() => (build && frame ? buildDrawPaths(build, frame) : []), [build, frame])
  const shadowPaths = useMemo(() => (build && frame ? buildShadowPaths(build, frame) : []), [build, frame])

  // Real asset gate: the scene resolves it after the PMREM environment bakes and
  // two frames have actually rendered. `?delayAsset` is a QA-only extra hold.
  const gateRef = useRef<ReturnType<typeof createDeferred<void>> | null>(null)
  if (!gateRef.current) gateRef.current = createDeferred<void>()
  const assetsReady = useMemo(() => {
    const delay = readAssetDelay()
    const wait = delay > 0 ? new Promise<void>((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve()
    return Promise.all([gateRef.current!.promise, wait]).then(() => {
      mark('assetsReadyAt')
    })
  }, [])

  const handleSceneReady = useCallback(() => {
    mark('sceneReadyAt')
    gateRef.current?.resolve()
  }, [])

  const { state, replay } = useOpeningSequence({
    build,
    frame,
    reduced,
    svgRef,
    sceneRef,
    assetsReady,
  })

  useEffect(() => {
    if (!build) return
    return () => disposeWord(build)
  }, [build])

  useEffect(() => {
    if (!build || !frame) return
    const geometryByLetter = build.letters.map((letter) => build.glyphs.get(letter.glyphKey)!.uuid)
    setExtra({
      font: { file: 'jost-morton-medium.ttf', family: 'Jost', weight: 500, license: 'SIL OFL 1.1' },
      word: {
        text: build.text,
        width: Number(build.bounds.width.toFixed(3)),
        height: Number(build.bounds.height.toFixed(3)),
        capHeight: build.capHeight,
        trackingEm: 0.075,
      },
      geometry: {
        unique: build.uniqueGlyphs,
        meshes: build.meshes,
        byLetter: geometryByLetter,
        sharedO: geometryByLetter[1] === geometryByLetter[4],
        sharedOInstances: build.letters[1].glyphKey === build.letters[4].glyphKey,
      },
      frame: {
        cssW: frame.cssW,
        cssH: frame.cssH,
        camW: Number(frame.camW.toFixed(3)),
        camH: Number(frame.camH.toFixed(3)),
        camY: Number(frame.camY.toFixed(3)),
        wordFill: frame.wordFill,
        dpr: frame.dpr,
        tier: frame.tier,
      },
      dpr: frame.dpr,
      reducedMotion: reduced,
    })
  }, [build, frame, reduced])

  useEffect(() => {
    if (!build) return
    setLetters(
      build.letters.map((letter) => ({
        id: letter.id,
        position: [letter.x, letter.y, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        visible: false,
      })),
    )
  }, [build])

  useEffect(() => {
    window.__MORTON_DEBUG__ = {
      setLetter: (index, patch) => sceneRef.current?.setLetter(index, patch),
      resetLetters: () => sceneRef.current?.resetLetters(),
      rendererInfo: () => sceneRef.current?.rendererInfo() ?? null,
      snapshot: () => window.__MORTON__ ?? null,
    }
    return () => {
      delete window.__MORTON_DEBUG__
    }
  }, [])

  useEffect(() => {
    if (!fontError) return
    mark('fontFailedAt')
    setExtra({ assetFallback: 'font', fontError })
    document.documentElement.dataset.assetFallback = 'font'
    setFallback(true)
    setState('hero')
  }, [fontError])

  const phase = fallback ? 'hero' : state
  const style = frame
    ? ({
        '--word-top': `${frame.wordTop.toFixed(2)}px`,
        '--word-bottom': `${frame.wordBottom.toFixed(2)}px`,
        '--word-height': `${frame.wordHeight.toFixed(2)}px`,
      } as CSSProperties)
    : undefined

  return (
    <main className="stage" ref={stageRef} data-morton-root data-phase={phase} style={style}>
      <Backdrop />
      {build && frame && shadowPaths.length > 0 ? <ShadowLayer paths={shadowPaths} frame={frame} /> : null}

      {build && frame ? (
        <div className="canvas-layer">
          <OpeningScene
            ref={sceneRef}
            build={build}
            frame={frame}
            pointer={pointer}
            visible={pageVisible}
            onReady={handleSceneReady}
          />
        </div>
      ) : null}

      {build && frame && paths.length > 0 ? <OutlineOverlay paths={paths} frame={frame} svgRef={svgRef} /> : null}

      {fallback ? <FallbackWordmark /> : null}

      <Chrome state={phase} onReplay={replay} />
    </main>
  )
}
