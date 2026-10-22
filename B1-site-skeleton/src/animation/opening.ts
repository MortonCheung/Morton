import gsap from 'gsap'
import { setOutlineProgress } from '../letters/letterModels'
import { mark, setExtra, setLetters, setState, type OpeningState } from '../lib/timeline'
import type { MortonStage } from '../scenes/MortonStage'

/**
 * Opening sequence: draw every glyph outline stroke by stroke (>= 1000 ms),
 * hold the completed line drawing as `built`, then extrude into the solid
 * letters over ~500 ms and settle into `hero`.
 *
 * The timing probe is written from real timeline callbacks — nothing here
 * reports a duration it did not actually spend.
 */
const DRAW_DURATION = 1.0
const DRAW_LETTER = 0.63
const DRAW_STAGGER = 0.074
const BUILT_HOLD_MS = 80
const EXPAND_DURATION = 0.5

export interface OpeningOptions {
  reduced: boolean
  onHero?: () => void
  onState?: (state: OpeningState) => void
}

const announce = (state: OpeningState, opts: OpeningOptions) => {
  setState(state)
  opts.onState?.(state)
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

async function criticalAssets(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const ready = Promise.all([document.fonts.ready, document.fonts.load('400 1em Marcellus')]).then(() => undefined)
  await Promise.race([ready, wait(3000)])
}

export async function runOpening(stage: MortonStage, opts: OpeningOptions): Promise<void> {
  const models = stage.models
  if (!models.length) return

  for (const model of models) {
    model.meshMat.opacity = 0
    model.meshMat.transparent = true
    model.mesh.castShadow = false
    model.outline.visible = true
    model.lineMat.opacity = 0.92
    setOutlineProgress(model, 0)
  }

  if (opts.reduced) {
    for (const model of models) {
      model.outline.visible = false
      model.meshMat.opacity = 1
      model.meshMat.transparent = false
      model.mesh.castShadow = stage.renderer.shadowMap.enabled
      model.meshMat.needsUpdate = true
    }
    stage.camera.position.set(0, 0, 7)
    stage.camera.lookAt(0, 0, 0)
    announce('reduced', opts)
    mark('reducedAt')
    stage.endOpening()
    setLetters(
      models.map((m) => ({
        id: m.id,
        position: [m.mesh.position.x, m.mesh.position.y, m.mesh.position.z],
        rotation: [m.mesh.rotation.x, m.mesh.rotation.y, m.mesh.rotation.z],
        visible: m.mesh.visible,
      })),
    )
    setExtra({ reducedMotion: true, drawSkipped: true })
    opts.onHero?.()
    return
  }

  stage.beginOpening()
  stage.camera.position.set(0, 0, 7.4)
  stage.camera.lookAt(0, 0, 0)

  announce('drawing', opts)
  const drawStartedAt = performance.now()

  const cursors = models.map(() => ({ v: 0 }))
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })
  cursors.forEach((cursor, i) => {
    const model = models[i]
    tl.to(
      cursor,
      {
        v: 1,
        duration: DRAW_LETTER,
        onUpdate: () => setOutlineProgress(model, cursor.v),
      },
      i * DRAW_STAGGER,
    )
  })
  tl.to({}, { duration: Math.max(0, DRAW_DURATION - (DRAW_LETTER + DRAW_STAGGER * (models.length - 1))) })
  await tl

  // Guarantee a >= 1000 ms build even if the final tween lands a few ms early.
  const drawFloor = 1020
  const elapsed = performance.now() - drawStartedAt
  if (elapsed < drawFloor) await wait(drawFloor - elapsed)

  // Real asset gate: the 3D letters exist, the UI font should be usable.
  announce('built', opts)
  await wait(BUILT_HOLD_MS)
  await criticalAssets()
  announce('expanding', opts)
  mark('expandStart')

  const cameraProxy = { z: 7.4 }
  const expand = gsap.timeline()
  expand
    .to(
      cameraProxy,
      {
        z: 7,
        duration: EXPAND_DURATION,
        ease: 'power3.inOut',
        onUpdate: () => {
          stage.camera.position.z = cameraProxy.z
          stage.camera.lookAt(0, 0, 0)
        },
      },
      0,
    )
    .to(
      models.map((m) => m.meshMat),
      { opacity: 1, duration: EXPAND_DURATION * 0.72, ease: 'power2.out', onUpdate: () => models.forEach((m) => (m.meshMat.needsUpdate = true)) },
      0,
    )
    .to(
      models.map((m) => m.lineMat),
      { opacity: 0, duration: EXPAND_DURATION * 0.8, ease: 'power2.in' },
      0.1,
    )
  await expand

  for (const model of models) {
    model.outline.visible = false
    model.meshMat.transparent = false
    model.meshMat.opacity = 1
    model.meshMat.needsUpdate = true
    model.mesh.castShadow = stage.renderer.shadowMap.enabled
  }
  stage.camera.position.set(0, 0, 7)
  stage.camera.lookAt(0, 0, 0)
  stage.endOpening()

  announce('hero', opts)
  const timings = window.__MORTON__?.timings ?? {}
  const drawn = (timings.builtAt ?? 0) - (timings.drawingAt ?? 0)
  const expanded = (timings.heroAt ?? 0) - (timings.expandingAt ?? 0)
  setExtra({
    drawMs: Math.round(drawn),
    expandMs: Math.round(expanded),
    totalMs: Math.round((timings.heroAt ?? 0) - (timings.drawingAt ?? 0)),
    triangles: stage.renderer.info.render.triangles,
    drawCalls: stage.renderer.info.render.calls,
    pixelRatio: stage.renderer.getPixelRatio(),
    reducedMotion: false,
  })
  setLetters(
    models.map((m) => ({
      id: m.id,
      position: [m.mesh.position.x, m.mesh.position.y, m.mesh.position.z],
      rotation: [m.mesh.rotation.x, m.mesh.rotation.y, m.mesh.rotation.z],
      visible: m.mesh.visible,
    })),
  )
  opts.onHero?.()
}
