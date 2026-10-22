import * as THREE from 'three'
import gsap from 'gsap'
import { buildWord, type BuiltWord } from '../letters/buildWord'
import { CameraRig, fitRadius, widthFractionFor, CAMERA_FOV } from '../animation/cameraRig'
import {
  completeLetters,
  createDrawTimeline,
  createExpandTimeline,
  resetLetters,
} from '../animation/openingTimeline'
import { createCriticalAssets, loadFontBuffer, type AssetStatus, type CriticalAssets } from '../lib/assets'
import {
  beginRun,
  mark,
  setExtra,
  setLetters as setProbeLetters,
  setState as setProbeState,
  type OpeningState,
} from '../lib/timeline'
import { FONT_URL, GLYPH, PLINTH, TIMING, WORD } from '../data/config'
import { dropTextureMaps } from './materials'
import { createLetters, type LetterVisual } from './letters'
import { ResourceRegistry } from './Resources'
import { CONTACT_OPACITY, createPlinth, createStudio, type Studio } from './studio'

const HERO_AZIMUTH = THREE.MathUtils.degToRad(17)
const HERO_SETTLE_AZIMUTH = THREE.MathUtils.degToRad(16.2)
const DRAW_AZIMUTH = THREE.MathUtils.degToRad(8)

export interface SculptureSceneOptions {
  reducedMotion: boolean
  onState: (state: OpeningState) => void
  onError: (reason: string) => void
}

interface DebugApi {
  stats: () => Record<string, unknown>
  setLetter: (
    index: number,
    patch: {
      position?: [number, number, number]
      rotation?: [number, number, number]
      visible?: boolean
    },
  ) => void
  resetLetters: () => void
  replay: () => void
  dispose: () => void
  info: () => Record<string, unknown>
  sweep: () => THREE.Mesh
  studio: () => Studio
}

interface ListenerRecord {
  target: EventTarget
  type: string
  handler: EventListener
  options?: AddEventListenerOptions
}

/**
 * Owner of the whole opening scene.
 *
 * Responsibilities: renderer/scene/camera, studio, letters, the opening state machine,
 * the real asset gate, the render loop, replay, resize/visibility handling and disposal.
 * It is the only owner of every GPU resource (see ResourceRegistry).
 */
export class SculptureScene {
  private readonly container: HTMLElement
  private readonly opts: SculptureSceneOptions
  private readonly registry = new ResourceRegistry()
  private readonly rig = new CameraRig()
  private readonly clock = new THREE.Clock()
  private readonly assets: CriticalAssets

  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private studio!: Studio

  private word: BuiltWord | null = null
  private letters: LetterVisual[] = []
  private lettersGroup: THREE.Group | null = null
  private plinth: THREE.Mesh | null = null

  private state: OpeningState = 'loading'
  private assetsSettled = false
  private assetStatus: AssetStatus | null = null
  private drawComplete = false
  private expandStarted = false
  private pendingExpand = false
  private disposed = false
  private reduced: boolean
  private fit = 9
  private targetY = 0.33
  private mobile = false
  private shadowMapSize: number

  private drawTl: gsap.core.Timeline | null = null
  private expandTl: gsap.core.Timeline | null = null
  private settleTween: gsap.core.Tween | null = null

  private rafId = 0
  private running = false
  private inView = true
  private hidden = false
  private heroStartedAt = 0

  private resizeObserver: ResizeObserver | null = null
  private intersectionObserver: IntersectionObserver | null = null
  private listeners: ListenerRecord[] = []
  private debugApi: DebugApi | null = null
  private finalStats: Record<string, unknown> | null = null

  constructor(container: HTMLElement, opts: SculptureSceneOptions) {
    this.container = container
    this.opts = opts
    this.reduced = opts.reducedMotion
    this.mobile = window.innerWidth <= 760
    this.shadowMapSize = this.mobile ? 1024 : 2048

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.75 : 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // Shadows are static after the opening; update only while geometry is moving.
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.shadowMap.needsUpdate = true
    this.renderer.setClearColor(0x0d0e0f, 1)

    const canvas = this.renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.mortonCanvas = 'true'
    container.appendChild(canvas)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0d0e0f)
    this.scene.environmentIntensity = 0.55
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 80)

    const loader = new THREE.TextureLoader()
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy() || 1)
    this.assets = createCriticalAssets(loader, anisotropy)
    // Asset textures are owned by the scene registry, not by the materials that sample them.
    this.registry.addTexture(this.assets.textures.mineral, this.assets.textures.contact)

    this.studio = createStudio(this.scene, this.renderer, this.registry, {
      shadowMapSize: this.shadowMapSize,
      contactTexture: this.assets.textures.contact,
    })

    this.layout(true)
    this.installObservers()
    this.installVisibilityHandling()
    this.installDebugApi()

    beginRun(false)
    this.setState('loading')

    if (!this.reduced) this.startLoop()
    this.renderOnce()

    void this.boot()
  }

  // ---------------------------------------------------------------------------------------------
  // Boot + state machine
  // ---------------------------------------------------------------------------------------------

  private async boot(): Promise<void> {
    try {
      const buffer = await loadFontBuffer(FONT_URL)
      if (this.disposed) return
      this.buildWord(buffer)
      this.assets.ready
        .then((status) => this.onAssetsSettled(status))
        .catch((err) => {
          console.error('[A2] critical asset gate rejected', err)
          this.onAssetsSettled({ mineral: false, contact: false, timedOut: true, fallback: true })
        })

      if (this.reduced) {
        this.finishReduced()
        return
      }
      this.startDrawing()
    } catch (err) {
      this.fatal('FONT_LOAD_FAILED', err)
    }
  }

  private buildWord(buffer: ArrayBuffer): void {
    const word = buildWord(buffer, WORD, {
      depth: GLYPH.depth,
      bevel: GLYPH.bevel,
      bevelSegments: GLYPH.bevelSegments,
      curveSegments: GLYPH.curveSegments,
      tracking: GLYPH.tracking,
    })
    this.word = word
    this.registry.addGeometry(...word.uniqueGeometries)

    // The display base is created after the word so it can be sized to the exact mark.
    const plinth = createPlinth(word.width, this.registry)
    this.plinth = plinth
    this.scene.add(plinth)
    const plinthWidth = word.width + PLINTH.marginX * 2

    const verticalOffset = PLINTH.height + 0.002 - word.minY
    this.letters = createLetters(
      word,
      { mineral: this.assets.textures.mineral },
      this.registry,
      verticalOffset,
    )
    this.lettersGroup = new THREE.Group()
    this.lettersGroup.name = 'morton-word'
    for (const letter of this.letters) this.lettersGroup.add(letter.group)
    this.scene.add(this.lettersGroup)
    resetLetters(this.letters)

    // Fit the base, not only the mark, so the slab never touches the side edges.
    this.fit = fitRadius(
      plinthWidth,
      word.height + PLINTH.height,
      this.aspect(),
      widthFractionFor(this.containerWidth()),
    )
    this.targetY = verticalOffset + word.height * 0.5 - word.height * 0.11

    // Contact shadow under the letters sits on the base top; the wider pool stays on the floor.
    const primary = this.studio.contactPrimary
    primary.position.set(0, PLINTH.height + 0.002, 0.02)
    primary.scale.set((word.width + 0.16) / 5.8, 0.5, 1)
    const secondary = this.studio.contactSecondary
    secondary.position.set(0, 0.004, 0.02)
    secondary.scale.set((plinthWidth + 0.5) / 9.2, 0.8, 1)
    this.rig.radius = this.fit * 1.02
    this.rig.targetY = this.targetY - 0.004
    this.rig.azimuth = DRAW_AZIMUTH
    if (this.assetStatus?.fallback) {
      if (!this.assetStatus.mineral) for (const l of this.letters) dropTextureMaps(l.material)
      if (!this.assetStatus.contact) {
        this.studio.contactPrimary.visible = false
        this.studio.contactSecondary.visible = false
      }
    }
    this.updateProbeLetters()
    setExtra({
      letterGeometryIds: this.letters.map((letter) => letter.mesh.geometry.uuid),
      word: {
        text: WORD,
        width: Number(word.width.toFixed(4)),
        height: Number(word.height.toFixed(4)),
        depth: word.depth,
        letters: word.letters.length,
        uniqueGlyphGeometries: word.uniqueGeometries.length,
      },
    })
    this.renderer.shadowMap.needsUpdate = true
  }

  private startDrawing(): void {
    if (!this.letters.length) return
    this.drawComplete = false
    this.expandStarted = false
    this.pendingExpand = false
    this.setState('drawing')
    this.updateProbeLetters()
    this.drawTl?.kill()
    this.drawTl = createDrawTimeline(this.letters, {
      drawMs: TIMING.drawMs,
      staggerMs: TIMING.letterStaggerMs,
      lineDrawMs: TIMING.lineDrawMs,
      solidDrawMs: TIMING.solidDrawMs,
      solidDelayMs: TIMING.solidDelayMs,
      studio: this.studio,
      onComplete: this.onDrawComplete,
    })
    this.drawTl.play(0)
  }

  private onDrawComplete = (): void => {
    if (this.disposed) return
    this.drawComplete = true
    this.setState('built')
    const t = window.__MORTON__?.timings
    if (t?.drawingAt != null && t.builtAt != null) {
      setExtra({ drawMs: t.builtAt - t.drawingAt })
    }
    this.renderer.shadowMap.needsUpdate = true
    // Let `built` paint for one frame before expanding: it is a real state, and the
    // hero must never appear in the same synchronous tick that finished the drawing.
    requestAnimationFrame(() => this.maybeExpand())
  }

  private onAssetsSettled(status: AssetStatus): void {
    if (this.disposed) return
    this.assetsSettled = true
    this.assetStatus = status
    if (status.fallback) {
      console.warn('[A2] critical asset fallback active', status)
      if (!status.mineral) {
        for (const letter of this.letters) dropTextureMaps(letter.material)
      }
      if (!status.contact) {
        this.studio.contactPrimary.visible = false
        this.studio.contactSecondary.visible = false
      }
      this.renderOnce()
    }
    setExtra({ assets: status })
    if (this.reduced) {
      this.renderOnce()
      return
    }
    this.maybeExpand()
  }

  private maybeExpand(): void {
    if (this.disposed || this.reduced) return
    if (!this.drawComplete || !this.assetsSettled || this.expandStarted) return
    if (this.state !== 'built') return
    if (this.hidden) {
      this.pendingExpand = true
      return
    }
    this.expand()
  }

  private expand(): void {
    if (this.expandStarted || this.disposed) return
    this.expandStarted = true
    this.pendingExpand = false
    this.setState('expanding')
    const from = { azimuth: this.rig.azimuth, radius: this.rig.radius, targetY: this.rig.targetY }
    const to = { azimuth: HERO_AZIMUTH, radius: this.fit, targetY: this.targetY }
    this.expandTl?.kill()
    this.expandTl = createExpandTimeline(this.rig, this.studio, from, to, TIMING.expandMs, this.onHero)
    this.expandTl.play(0)
  }

  private onHero = (): void => {
    if (this.disposed) return
    const t = window.__MORTON__?.timings
    this.setState('hero')
    this.heroStartedAt = performance.now()
    if (this.letters.length) this.updateProbeLetters()
    setExtra({
      timings: {
        drawMs: t?.drawingAt != null && t.builtAt != null ? t.builtAt - t.drawingAt : null,
        expandMs: t?.expandingAt != null && t.heroAt != null ? t.heroAt - t.expandingAt : null,
      },
      renderer: this.rendererInfo(),
    })
    // The camera settles back from the side reveal into the stable full composition.
    if (!this.reduced) {
      this.settleTween?.kill()
      this.settleTween = gsap.to(this.rig, {
        azimuth: HERO_SETTLE_AZIMUTH,
        duration: 2.2,
        ease: 'power2.inOut',
      })
    }
  }

  private finishReduced(): void {
    completeLetters(this.letters)
    this.studio.contactPrimary.material.opacity = CONTACT_OPACITY.primary
    this.studio.contactSecondary.material.opacity = CONTACT_OPACITY.secondary
    this.rig.azimuth = HERO_SETTLE_AZIMUTH
    this.rig.radius = this.fit
    this.rig.targetY = this.targetY
    this.renderer.shadowMap.needsUpdate = true
    this.setState('reduced')
    this.updateProbeLetters()
    setExtra({
      reducedMotion: true,
      renderer: this.rendererInfo(),
      word: this.word
        ? {
            text: WORD,
            width: Number(this.word.width.toFixed(4)),
            height: Number(this.word.height.toFixed(4)),
            depth: this.word.depth,
            letters: this.word.letters.length,
            uniqueGlyphGeometries: this.word.uniqueGeometries.length,
          }
        : null,
    })
    this.renderOnce()
  }

  private fatal(reason: string, err: unknown): void {
    console.error(`[A2] fatal: ${reason}`, err)
    mark('errorAt')
    setExtra({ error: reason, errorMessage: String(err) })
    this.opts.onError(reason)
  }

  // ---------------------------------------------------------------------------------------------
  // Replay
  // ---------------------------------------------------------------------------------------------

  replay(): void {
    if (this.disposed || !this.letters.length) return
    this.killTimelines()
    beginRun(true)
    this.setState('loading')
    this.drawComplete = false
    this.expandStarted = false
    this.pendingExpand = false
    resetLetters(this.letters)
    this.studio.contactPrimary.material.opacity = 0
    this.studio.contactSecondary.material.opacity = 0
    this.rig.azimuth = DRAW_AZIMUTH
    this.rig.radius = this.fit * 1.02
    this.rig.targetY = this.targetY - 0.004
    this.heroStartedAt = 0
    this.updateProbeLetters()

    if (this.reduced) {
      this.finishReduced()
      return
    }
    if (!this.running) this.startLoop()
    this.renderer.shadowMap.needsUpdate = true
    this.startDrawing()
  }

  private killTimelines(): void {
    this.drawTl?.kill()
    this.expandTl?.kill()
    this.settleTween?.kill()
    this.drawTl = null
    this.expandTl = null
    this.settleTween = null
  }

  // ---------------------------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------------------------

  private startLoop(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.clock.getDelta()
    this.rafId = requestAnimationFrame(this.tick)
  }

  private stopLoop(): void {
    if (!this.running) return
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private tick = (): void => {
    this.rafId = 0
    if (!this.running || this.disposed) return
    // Off-screen / background: stop the loop entirely instead of polling every frame.
    if (this.hidden || !this.inView) {
      this.running = false
      return
    }

    if (this.state === 'drawing') {
      this.renderer.shadowMap.needsUpdate = true
    }

    let drift = 0
    if (this.state === 'hero' && !this.reduced) {
      const t = (performance.now() - this.heroStartedAt) / 1000
      const ramp = Math.min(1, Math.max(0, (t - 1.6) / 2.4))
      drift = Math.sin((t / 15) * Math.PI * 2) * 0.0075 * ramp
    }
    this.rig.apply(this.camera, drift)
    this.renderer.render(this.scene, this.camera)
    this.rafId = requestAnimationFrame(this.tick)
  }

  private renderOnce(): void {
    if (this.disposed) return
    this.rig.apply(this.camera)
    this.renderer.render(this.scene, this.camera)
  }

  // ---------------------------------------------------------------------------------------------
  // Layout / observers
  // ---------------------------------------------------------------------------------------------

  private containerWidth(): number {
    return this.container.clientWidth || window.innerWidth
  }

  private aspect(): number {
    const w = this.containerWidth()
    const h = this.container.clientHeight || window.innerHeight
    return w / Math.max(1, h)
  }

  private layout(initial = false): void {
    const width = this.containerWidth()
    const height = this.container.clientHeight || window.innerHeight
    this.mobile = width <= 760
    const dprCap = this.mobile ? 1.75 : 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
    this.renderer.setSize(width, height, true)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()

    if (this.word) {
      const plinthWidth = this.word.width + PLINTH.marginX * 2
      const fit = fitRadius(
        plinthWidth,
        this.word.height + PLINTH.height,
        this.camera.aspect,
        widthFractionFor(width),
      )
      this.fit = fit
      this.targetY =
        PLINTH.height + 0.002 - this.word.minY + this.word.height * 0.5 - this.word.height * 0.11
      if (this.state === 'drawing') {
        this.rig.radius = fit * 1.02
        this.rig.targetY = this.targetY - 0.004
      } else if (this.state === 'built' || this.state === 'hero' || this.reduced) {
        this.rig.radius = fit
        this.rig.targetY = this.targetY
      }
    }

    if (initial || this.reduced) {
      this.rig.apply(this.camera)
      this.renderOnce()
    }
  }

  private installObservers(): void {
    this.resizeObserver = new ResizeObserver(() => this.layout())
    this.resizeObserver.observe(this.container)

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        this.inView = entry ? entry.isIntersecting : true
        if (this.inView && !this.hidden) this.startLoop()
      },
      { threshold: 0.01 },
    )
    this.intersectionObserver.observe(this.container)

    this.on(window, 'orientationchange', () => this.layout())
    // A resize after the hero has settled still needs a correct final composition.
    this.on(window, 'resize', () => {
      if (this.state === 'hero' && !this.reduced) {
        this.rig.radius = this.fit
        this.rig.targetY = this.targetY
      }
    })
  }

  private installVisibilityHandling(): void {
    this.on(document, 'visibilitychange', () => {
      this.hidden = document.hidden
      if (this.hidden) {
        this.stopLoop()
        this.drawTl?.pause()
        this.expandTl?.pause()
        this.settleTween?.pause()
      } else {
        this.clock.getDelta()
        if (!this.reduced) this.startLoop()
        this.drawTl?.resume()
        this.expandTl?.resume()
        this.settleTween?.resume()
        if (this.pendingExpand) {
          this.pendingExpand = false
          this.maybeExpand()
        }
        if (this.reduced) this.renderOnce()
      }
    })
  }

  private on(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options)
    this.listeners.push({ target, type, handler, options })
  }

  // ---------------------------------------------------------------------------------------------
  // Probe + debug
  // ---------------------------------------------------------------------------------------------

  private setState(state: OpeningState): void {
    this.state = state
    setProbeState(state)
    this.opts.onState(state)
  }

  private updateProbeLetters(): void {
    if (!this.letters.length) return
    setProbeLetters(
      this.letters.map((letter) => ({
        id: `${letter.char}-${letter.index}`,
        position: letter.group.position.toArray() as [number, number, number],
        rotation: [
          letter.group.rotation.x,
          letter.group.rotation.y,
          letter.group.rotation.z,
        ] as [number, number, number],
        visible: letter.group.visible,
      })),
    )
  }

  private rendererInfo(): Record<string, unknown> {
    const info = this.renderer.info
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      dpr: this.renderer.getPixelRatio(),
      shadowMapSize: this.shadowMapSize,
      reducedMotion: this.reduced,
    }
  }

  private installDebugApi(): void {
    const api: DebugApi = {
      stats: () => this.stats(),
      setLetter: (index, patch) => {
        if (this.disposed) return
        const letter = this.letters[index]
        if (!letter) throw new Error(`no letter at index ${index}`)
        if (patch.position) letter.group.position.fromArray(patch.position)
        if (patch.rotation) letter.group.rotation.fromArray(patch.rotation)
        if (patch.visible != null) letter.group.visible = patch.visible
        this.updateProbeLetters()
      },
      resetLetters: () => {
        if (this.disposed) return
        for (const letter of this.letters) {
          letter.group.position.copy(letter.basePosition)
          letter.group.rotation.copy(letter.baseRotation)
          letter.group.visible = true
        }
        this.updateProbeLetters()
      },
      replay: () => this.replay(),
      dispose: () => this.dispose(),
      sweep: () => this.studio.sweep,
      studio: () => this.studio,
      info: () => ({
        state: this.state,
        reducedMotion: this.reduced,
        fitRadius: this.fit,
        camera: {
          position: this.camera.position.toArray(),
          target: [this.rig.targetX, this.rig.targetY, this.rig.targetZ],
        },
        word: this.word
          ? {
              width: this.word.width,
              height: this.word.height,
              depth: this.word.depth,
              glyphIds: this.word.letters.map((l) => l.geometry.uuid),
            }
          : null,
        assets: this.assetStatus,
      }),
    }
    this.debugApi = api
    window.__MORTON_DEBUG__ = api
  }

  stats(): Record<string, unknown> {
    if (this.disposed) {
      return { disposed: true, ...(this.finalStats ?? {}) }
    }
    return {
      disposed: false,
      state: this.state,
      listeners: this.listeners.length,
      canvases: this.container.querySelectorAll('canvas').length,
      owned: this.registry.counts,
      ...this.rendererInfo(),
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Teardown
  // ---------------------------------------------------------------------------------------------

  dispose(): void {
    if (this.disposed) return
    this.killTimelines()
    this.stopLoop()

    for (const record of this.listeners) {
      record.target.removeEventListener(record.type, record.handler, record.options)
    }
    this.listeners = []

    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.intersectionObserver?.disconnect()
    this.intersectionObserver = null

    // The debug API intentionally stays reachable after dispose: it is the only way an
    // automated lifecycle check can read the final resource counts. Its mutators are
    // no-ops once `disposed` is set.
    // Shadow maps are owned by the lights, not the studio registry.
    for (const light of [
      this.studio.keyLight,
      this.studio.floorLight,
      this.studio.floorFill,
      this.studio.rimLight,
      this.studio.washLight,
    ]) {
      const shadowMap = light.shadow?.map
      if (shadowMap) {
        shadowMap.dispose()
        light.shadow.map = null
      }
    }
    this.scene.environment = null
    this.registry.disposeAll()
    const info = this.renderer.info
    this.finalStats = {
      stateAtDispose: this.state,
      listeners: 0,
      canvases: 0,
      owned: this.registry.counts,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
    }

    this.disposed = true
    this.renderer.dispose()
    try {
      this.renderer.forceContextLoss()
    } catch {
      /* context already gone */
    }
    this.renderer.domElement.remove()
    this.letters = []
    this.lettersGroup = null
    this.plinth = null
    this.word = null
  }
}
