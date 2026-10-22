import * as THREE from 'three'
import { OUTLINE } from '../data/outline.generated'
import { CAMERA, CAMERA_DEG, FRAMING, LIGHTING, WORD } from '../data/stageConfig'
import { LETTER_GEOMETRY } from '../data/wordSpec'
import { buildWord, type LetterSpec } from '../letters/buildWord'
import { createLetterMaterial, type LetterMaterialBundle } from './letterMaterial'
import { createStudio, type Studio } from './studio'
import { computeFrame, overlayTransform, type FrameInfo } from './framing'
import type { QualityTier } from '../types/opening'

export interface SceneMotion {
  /** per-letter reveal 0..1; objects so GSAP can tween them without proxies */
  reveal: Array<{ v: number }>
  environment: number
  key: number
  rim: number
  fill: number
  /** 0 = drawing distance, 1 = hero distance */
  dolly: number
  orbitYaw: number
  orbitElev: number
}

export interface LetterSnapshot {
  id: string
  char: string
  position: [number, number, number]
  rotation: [number, number, number]
  visible: boolean
  geometryId: string
}

const deg = (d: number) => (d * Math.PI) / 180

/**
 * Owns every WebGL resource of the opening: renderer, scene, environment map,
 * floor, lights, the six letter meshes and their shared geometries/materials,
 * the render loop and the pointer listener.
 *
 * Animation code never touches three.js objects directly — it tweens
 * `scene.motion`, and the render loop applies that state. One writer, no
 * duplicated timelines fighting over the same property.
 */
export class OpeningScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly motion: SceneMotion = {
    reveal: Array.from({ length: 6 }, () => ({ v: 0 })),
    environment: LIGHTING.base.environment,
    key: LIGHTING.base.key,
    rim: LIGHTING.base.rim,
    fill: LIGHTING.base.fill,
    dolly: 0,
    orbitYaw: 0,
    orbitElev: 0,
  }

  private readonly studio: Studio
  private readonly letters: LetterMaterialBundle
  private readonly geometries = new Set<THREE.BufferGeometry>()
  private group: THREE.Group | null = null
  private meshes: THREE.Mesh[] = []
  private raf = 0
  private running = false
  private idle = false
  private frameInfo: FrameInfo
  private lastFrameMs = 0
  private fpsEma = 60
  private pointerTarget = { x: 0, y: 0 }
  private pointer = { x: 0, y: 0 }
  private pointerBound = false
  private disposed = false
  private layoutMatch = true

  constructor(canvas: HTMLCanvasElement, quality: QualityTier) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(quality.maxDpr)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = LIGHTING.exposure
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.VSMShadowMap

    this.scene.fog = new THREE.FogExp2(LIGHTING.fogColor, LIGHTING.fogDensity)

    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
    this.camera.position.set(0, 0, 10)

    this.studio = createStudio(this.renderer, quality.shadowMapSize)
    this.scene.environment = this.studio.environment
    this.scene.environmentIntensity = LIGHTING.base.environment
    this.scene.add(this.studio.floorGroup, this.studio.key, this.studio.rim, this.studio.fill)

    this.letters = createLetterMaterial()
    this.frameInfo = computeFrame(1, 1)

    this.bindPointer()
    this.resize()
  }

  // ---------------------------------------------------------------- framing

  resize(): void {
    if (this.disposed) return
    const canvas = this.renderer.domElement
    const cssWidth = Math.max(canvas.clientWidth, 1)
    const cssHeight = Math.max(canvas.clientHeight, 1)
    this.frameInfo = computeFrame(cssWidth, cssHeight)
    this.camera.aspect = cssWidth / cssHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(cssWidth, cssHeight, false)
    this.applyCamera(performance.now() / 1000)
  }

  /** SVG overlay transform for the drawing pose (camera level, z=0 plane). */
  projection(): { k: number; d: number; width: number; height: number } {
    return overlayTransform(this.frameInfo)
  }

  // ---------------------------------------------------------------- letters

  async loadLetters(buffer: ArrayBuffer, quality: QualityTier): Promise<{ parseMs: number; compileMs: number }> {
    if (this.group) return { parseMs: 0, compileMs: 0 }
    const buildStart = performance.now()
    const built = buildWord(buffer, WORD, {
      depth: LETTER_GEOMETRY.depth,
      bevel: LETTER_GEOMETRY.bevel,
      bevelSegments: quality.bevelSegments,
      curveSegments: quality.curveSegments,
      tracking: OUTLINE.tracking,
      emSize: OUTLINE.emSize,
    })

    const mismatched = built.letters.filter((l, i) => Math.abs(l.offsetX - OUTLINE.letters[i].offsetX) > 1e-4)
    this.layoutMatch = mismatched.length === 0
    if (!this.layoutMatch) {
      console.warn('[A1] outline/geometry layout drift', mismatched.map((l) => `${l.id}:${l.offsetX}`))
    }

    const group = new THREE.Group()
    group.name = 'wordmark'
    group.position.y = -FRAMING.wordCenterY
    this.meshes = built.letters.map((spec: LetterSpec) => {
      this.geometries.add(spec.geometry)
      const mesh = new THREE.Mesh(spec.geometry, this.letters.material)
      mesh.name = `letter-${spec.id}`
      mesh.position.x = spec.offsetX
      mesh.position.z = -0.22
      mesh.scale.z = 0.06
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.spec = spec
      group.add(mesh)
      return mesh
    })
    group.visible = false
    this.scene.add(group)
    this.group = group

    const parseMs = performance.now() - buildStart
    // compile while the letters are still hidden (compile traverses invisible
    // objects too) so the first revealed frame does not hitch
    const compileStart = performance.now()
    await this.renderer.compileAsync(this.scene, this.camera)
    return { parseMs, compileMs: performance.now() - compileStart }
  }

  /** shared by all six meshes; animated only during the reveal */
  get letterMaterial(): THREE.MeshPhysicalMaterial {
    return this.letters.material
  }

  showLetters(visible: boolean): void {
    if (this.group) this.group.visible = visible
  }

  beginReveal(): void {
    // no material state change here on purpose — see letterMaterial.ts
    this.letters.material.opacity = 0
    if (this.group) this.group.visible = true
  }

  endReveal(): void {
    this.letters.material.opacity = 1
  }

  /** Return to the pre-drawing pose without touching loaded geometry/assets. */
  resetForReplay(): void {
    this.idle = false
    const m = this.motion
    m.environment = LIGHTING.base.environment
    m.key = LIGHTING.base.key
    m.rim = LIGHTING.base.rim
    m.fill = LIGHTING.base.fill
    m.dolly = 0
    m.orbitYaw = 0
    m.orbitElev = 0
    for (const slot of m.reveal) slot.v = 0
    this.letters.material.opacity = 1
    this.showLetters(false)
    this.applyReveal()
    this.applyStudio()
    this.applyCamera(performance.now() / 1000)
  }

  /** Immediate terminal state for reduced motion / composition-free QA. */
  applyHeroNow(): void {
    this.motion.environment = LIGHTING.environmentIntensity
    this.motion.key = 1
    this.motion.rim = 1
    this.motion.fill = 1
    this.motion.dolly = 1
    this.motion.orbitYaw = CAMERA_DEG.heroYaw
    this.motion.orbitElev = CAMERA_DEG.heroElevation
    for (const r of this.motion.reveal) r.v = 1
    this.applyReveal()
    this.showLetters(true)
    this.endReveal()
  }

  // ---------------------------------------------------------------- loop

  start(): void {
    if (this.running || this.disposed) return
    this.running = true
    this.lastFrameMs = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  pause(): void {
    this.running = false
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  resume(): void {
    if (this.disposed || this.running) return
    this.lastFrameMs = performance.now()
    this.start()
  }

  setIdle(idle: boolean): void {
    this.idle = idle
  }

  isRunning(): boolean {
    return this.running
  }

  private tick = (nowMs: number): void => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)
    const dt = Math.min((nowMs - this.lastFrameMs) / 1000, 0.1)
    this.lastFrameMs = nowMs
    if (dt > 0) this.fpsEma += (1 / dt - this.fpsEma) * 0.05

    // smooth pointer parallax without allocating
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * Math.min(1, dt * 4)
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * Math.min(1, dt * 4)

    this.applyReveal()
    this.applyCamera(nowMs / 1000)
    this.applyStudio()
    this.renderer.render(this.scene, this.camera)
  }

  private applyStudio(): void {
    const m = this.motion
    this.scene.environmentIntensity = m.environment
    this.studio.key.intensity = LIGHTING.keyIntensity * m.key
    this.studio.rim.intensity = LIGHTING.rimIntensity * m.rim
    this.studio.fill.intensity = LIGHTING.fillIntensity * m.fill
  }

  private applyReveal(): void {
    if (!this.meshes.length) return
    for (let i = 0; i < this.meshes.length; i++) {
      const v = this.motion.reveal[i]?.v ?? 0
      const mesh = this.meshes[i]
      // volume grows forward out of the construction plane
      mesh.position.z = -0.22 * (1 - v)
      mesh.scale.z = 0.06 + 0.94 * v
    }
  }

  private applyCamera(nowSec: number): void {
    const f = this.frameInfo
    const m = this.motion
    const radius = f.dist * (1 - m.dolly * CAMERA.revealDolly)
    let yaw = m.orbitYaw
    let elev = m.orbitElev

    if (this.idle) {
      const t = (nowSec * 1000 * Math.PI * 2) / CAMERA.idlePeriodMs
      yaw += Math.sin(t) * deg(CAMERA.idleYawDeg)
      elev += Math.sin(t * 0.73 + 1.2) * deg(CAMERA.idleElevationDeg)
      yaw += this.pointer.x * deg(CAMERA.pointerYawDeg)
      elev += this.pointer.y * deg(CAMERA.pointerElevationDeg)
    }

    const ce = Math.cos(elev)
    this.camera.position.set(Math.sin(yaw) * radius * ce, f.camY + Math.sin(elev) * radius, Math.cos(yaw) * radius * ce)
    this.camera.lookAt(0, f.camY, 0)
  }

  // ---------------------------------------------------------------- input

  private bindPointer(): void {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (event: PointerEvent) => {
      this.pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1
      this.pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    const onLeave = () => {
      this.pointerTarget.x = 0
      this.pointerTarget.y = 0
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave, { passive: true })
    this.pointerBound = true
    this.detachPointer = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }

  private detachPointer: (() => void) | null = null

  // ---------------------------------------------------------------- evidence

  snapshotLetters(): LetterSnapshot[] {
    return this.meshes.map((mesh, i) => {
      const spec = mesh.userData.spec as LetterSpec | undefined
      return {
        id: spec?.id ?? `letter-${i}`,
        char: spec?.char ?? WORD[i],
        position: [mesh.position.x, mesh.position.y + (this.group?.position.y ?? 0), mesh.position.z],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
        visible: Boolean(this.group?.visible) && mesh.visible,
        geometryId: mesh.geometry.uuid,
      }
    })
  }

  /** QA-only: rotate one letter to prove transforms are independent. */
  nudgeLetter(id: string, rotation: [number, number, number]): boolean {
    const mesh = this.meshes.find((m) => (m.userData.spec as LetterSpec | undefined)?.id === id)
    if (!mesh) return false
    mesh.rotation.set(rotation[0], rotation[1], rotation[2])
    return true
  }

  getLayoutMatch(): boolean {
    return this.layoutMatch
  }

  getStats() {
    const info = this.renderer.info
    return {
      fps: Math.round(this.fpsEma),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      dpr: this.renderer.getPixelRatio(),
      shadowMapSize: this.studio.key.shadow.mapSize.x,
      drawingBuffer: [this.renderer.domElement.width, this.renderer.domElement.height],
    }
  }

  // ---------------------------------------------------------------- dispose

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.pause()
    this.detachPointer?.()
    this.detachPointer = null
    this.idle = false

    if (this.group) {
      this.scene.remove(this.group)
      this.group.clear()
      this.group = null
    }
    for (const geometry of this.geometries) geometry.dispose()
    this.geometries.clear()
    this.meshes = []
    this.letters.dispose()

    this.scene.remove(this.studio.floorGroup, this.studio.key, this.studio.rim, this.studio.fill)
    this.scene.environment = null
    this.studio.dispose()

    this.scene.fog = null
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
