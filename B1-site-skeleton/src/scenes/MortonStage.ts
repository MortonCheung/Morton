import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createLetterSet, type LetterModel } from '../letters/letterModels'
import type { LetterId } from '../data/chapters'
import { clamp, isNarrow } from '../lib/dom'
import { emptyMetrics, heroPose, type PoseMetrics, type StagePose } from './poseModel'

const INK = new THREE.Color('#1b1813')
const GHOST = new THREE.Color('#e6dfd1')
const CAMERA_FOV = 38
const HERO_CAM_Z = 7

export interface StageOptions {
  reduced: boolean
}

/**
 * Owns exactly one WebGL context for the whole site.
 *
 * Lifecycle:
 *   new -> load() -> beginOpening() -> endOpening() -> setPose()* -> dispose()
 *
 * Rendering is on demand: the RAF loop stops as soon as the pose has settled
 * and the opening is finished, so an idle page costs no frames.
 */
export class MortonStage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly root = new THREE.Group()

  models: LetterModel[] = []
  metrics: PoseMetrics = emptyMetrics()
  readonly reduced: boolean

  mode: 'empty' | 'opening' | 'story' = 'empty'
  ready = false

  private container: HTMLElement
  private envRT: THREE.WebGLRenderTarget | null = null
  private shadowPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial> | null = null
  private resizeObserver: ResizeObserver | null = null
  private raf = 0
  private last = 0
  private target: StagePose | null = null
  private current: StagePose | null = null
  private camTarget = new THREE.Vector3(0, 0, HERO_CAM_Z)
  private camCurrent = new THREE.Vector3(0, 0, HERO_CAM_Z)
  private pointer = new THREE.Vector2()
  private pointerActive = false
  private dirty = true
  private disposed = false
  private onResize = () => this.resize()
  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else {
      this.last = 0
      this.wake()
    }
  }
  private onPointerMove = (event: PointerEvent) => {
    if (this.reduced) return
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1)
    this.pointerActive = true
    this.wake()
  }
  private onPointerLeave = () => {
    this.pointerActive = false
    this.wake()
  }

  constructor(container: HTMLElement, opts: StageOptions) {
    this.container = container
    this.reduced = opts.reduced
    const narrow = isNarrow()
    const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.75 : 2)

    const canvas = document.createElement('canvas')
    canvas.className = 'stage__canvas'
    canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(canvas)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !narrow,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setClearAlpha(0)
    this.renderer.shadowMap.enabled = !narrow
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 60)
    this.camera.position.copy(this.camCurrent)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.root)
    this.setupLights(narrow)
    this.setupEnvironment()

    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(document.documentElement)
    window.addEventListener('resize', this.onResize)
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })
    window.addEventListener('pointerleave', this.onPointerLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private setupLights(narrow: boolean) {
    const hemi = new THREE.HemisphereLight(0xfbf5e9, 0xa99d88, 0.6)
    this.scene.add(hemi)

    const key = new THREE.DirectionalLight(0xfff4e2, 2.1)
    key.position.set(1.4, 6.4, 3.2)
    key.castShadow = !narrow
    if (key.castShadow) {
      key.shadow.mapSize.set(1024, 1024)
      key.shadow.camera.left = -4.5
      key.shadow.camera.right = 4.5
      key.shadow.camera.top = 4.5
      key.shadow.camera.bottom = -4.5
      key.shadow.camera.near = 0.5
      key.shadow.camera.far = 24
      key.shadow.bias = -0.0012
      key.shadow.radius = 2.5
    }
    this.scene.add(key)

    const rim = new THREE.DirectionalLight(0xdfe8ef, 0.75)
    rim.position.set(-4.2, 1.4, -3.4)
    this.scene.add(rim)

    const fill = new THREE.AmbientLight(0xfff6e6, 0.12)
    this.scene.add(fill)

    if (!narrow) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.ShadowMaterial({ opacity: 0.13 }))
      plane.rotation.x = -Math.PI / 2
      plane.position.y = -0.58
      plane.receiveShadow = true
      plane.name = 'shadow-catcher'
      this.shadowPlane = plane
      this.root.add(plane)
    }
  }

  private setupEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const env = new RoomEnvironment()
    this.envRT = pmrem.fromScene(env, 0.05)
    this.scene.environment = this.envRT.texture
    this.scene.environmentIntensity = 0.35
    env.dispose()
    pmrem.dispose()
  }

  /** Load the font, build the six letters, apply the hero stance. */
  async load(url = './fonts/marcellus.ttf'): Promise<void> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`font load failed: ${response.status}`)
    const buffer = await response.arrayBuffer()
    const set = createLetterSet(buffer)

    this.models = set.models
    const baseX = {} as Record<LetterId, number>
    for (const model of set.models) baseX[model.id] = model.baseX
    this.metrics = { width: set.width, capHeight: set.capHeight, baseX }

    for (const model of set.models) {
      model.mesh.visible = true
      model.meshMat.transparent = true
      model.meshMat.opacity = 0
      model.meshMat.needsUpdate = true
      this.root.add(model.mesh)
      this.root.add(model.outline)
    }

    this.fit()
    this.applyPose(heroPose(this.metrics, isNarrow()))
    for (const model of set.models) model.mesh.castShadow = false
    this.ready = true
    this.resize()
  }

  /** Called by the opening timeline so the stage never fights it for transforms. */
  beginOpening() {
    this.mode = 'opening'
    this.models.forEach((m) => {
      m.outline.visible = true
    })
    this.wake()
  }

  endOpening() {
    if (!this.ready) return
    const pose = heroPose(this.metrics, isNarrow())
    this.mode = 'story'
    this.target = pose
    this.current = pose
    for (const model of this.models) {
      model.outline.visible = false
      model.meshMat.transparent = false
      model.meshMat.opacity = 1
      model.meshMat.needsUpdate = true
    }
    this.camCurrent.set(pose.camera.x, pose.camera.y, pose.camera.z)
    this.camTarget.copy(this.camCurrent)
    this.applyPose(pose)
    this.dirty = true
    this.wake()
  }

  setPose(pose: StagePose) {
    if (this.mode !== 'story') return
    this.target = pose
    this.camTarget.set(pose.camera.x, pose.camera.y, pose.camera.z)
    this.wake()
  }

  /** Debug snapshot for the verification probe (read by the capture scripts). */
  snapshot(): Record<string, unknown> {
    return {
      root: Number(this.root.scale.x.toFixed(3)),
      cam: [Number(this.camera.position.x.toFixed(2)), Number(this.camera.position.y.toFixed(2)), Number(this.camera.position.z.toFixed(2))],
      letters: this.models.map((m) => ({
        id: m.id,
        x: Number(m.mesh.position.x.toFixed(3)),
        y: Number(m.mesh.position.y.toFixed(3)),
        z: Number(m.mesh.position.z.toFixed(2)),
        s: Number(m.mesh.scale.x.toFixed(2)),
        tone: Number(m.meshMat.color.getHexString()),
      })),
    }
  }

  /** Keep the loop alive for n ms (used while a GSAP opening tween runs). */
  wake(): void {
    this.dirty = true
    if (this.disposed) return
    if (!this.raf) {
      this.last = 0
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private fit() {
    const narrow = isNarrow()
    const aspect = window.innerWidth / Math.max(1, window.innerHeight)
    const visibleH = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * HERO_CAM_Z
    const visibleW = visibleH * aspect
    const fit = clamp((visibleW * (narrow ? 0.9 : 0.7)) / Math.max(0.001, this.metrics.width), 0.16, 1.45)
    this.root.scale.setScalar(fit)
  }

  private resize() {
    if (this.disposed) return
    const w = window.innerWidth
    const h = Math.max(1, window.innerHeight)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.fit()
    this.dirty = true
    this.wake()
  }

  private tick = (now: number) => {
    this.raf = 0
    if (this.disposed) return
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60
    this.last = now

    let moving = false
    if (this.mode === 'story' && this.target && this.current) {
      const target = this.target
      const current = this.current
      const k = this.reduced ? 1 : 1 - Math.exp(-dt * 9)
      let maxDelta = 0
      for (const id of Object.keys(target.letters) as LetterId[]) {
        const a = current.letters[id]
        const b = target.letters[id]
        a.x += (b.x - a.x) * k
        a.y += (b.y - a.y) * k
        a.z += (b.z - a.z) * k
        a.rx += (b.rx - a.rx) * k
        a.ry += (b.ry - a.ry) * k
        a.rz += (b.rz - a.rz) * k
        a.scale += (b.scale - a.scale) * k
        a.tone += (b.tone - a.tone) * k
        maxDelta = Math.max(
          maxDelta,
          Math.abs(b.x - a.x),
          Math.abs(b.y - a.y),
          Math.abs(b.z - a.z),
          Math.abs(b.ry - a.ry) * 2,
          Math.abs(b.scale - a.scale),
          Math.abs(b.tone - a.tone),
        )
      }
      this.camCurrent.lerp(this.camTarget, k)
      const camDelta = this.camCurrent.distanceTo(this.camTarget)
      maxDelta = Math.max(maxDelta, camDelta)
      this.applyPose(current)
      moving = maxDelta > 0.0008
    } else if (this.mode === 'opening') {
      moving = true
    }

    const px = this.pointerActive && !this.reduced && this.mode === 'story' ? this.pointer.x : 0
    const py = this.pointerActive && !this.reduced && this.mode === 'story' ? this.pointer.y : 0
    if (this.mode === 'story') {
      this.camera.position.set(this.camCurrent.x + px * 0.14, this.camCurrent.y - py * 0.1, this.camCurrent.z)
      this.camera.lookAt(0, 0, 0)
    }

    this.renderer.render(this.scene, this.camera)

    if (moving || this.dirty) {
      this.dirty = false
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private applyPose(pose: StagePose) {
    for (const model of this.models) {
      const p = pose.letters[model.id]
      if (!p) continue
      model.mesh.position.set(p.x, p.y, p.z)
      model.mesh.rotation.set(p.rx, p.ry, p.rz)
      model.mesh.scale.setScalar(p.scale)
      model.outline.position.set(p.x, p.y, p.z)
      model.outline.rotation.set(p.rx, p.ry, p.rz)
      model.outline.scale.setScalar(p.scale)
      model.meshMat.color.copy(GHOST).lerp(INK, clamp(p.tone))
      model.mesh.castShadow = p.tone > 0.6 && this.renderer.shadowMap.enabled
      if (this.shadowPlane) this.shadowPlane.visible = this.renderer.shadowMap.enabled
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerleave', this.onPointerLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
    for (const model of this.models) {
      this.root.remove(model.mesh)
      this.root.remove(model.outline)
    }
    this.shadowPlane?.geometry.dispose()
    this.shadowPlane?.material.dispose()
    this.shadowPlane = null
    this.envRT?.dispose()
    this.envRT = null
    this.scene.environment = null
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
