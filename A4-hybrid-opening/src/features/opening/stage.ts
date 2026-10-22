import * as THREE from 'three'
import type { CameraLayout } from '../../scenes/cameraLayout'

export interface OutlineTarget {
  root: SVGSVGElement
  group: SVGGElement
  letterGroups: SVGGElement[]
  paths: SVGPathElement[][]
}

export interface SceneApi {
  camera: THREE.PerspectiveCamera
  gl: THREE.WebGLRenderer
  group: THREE.Group
  meshes: THREE.Mesh[]
  material: THREE.MeshPhysicalMaterial
  keyLight: THREE.DirectionalLight | null
  invalidate: () => void
  syncProbe: () => void
  isMobile: boolean
}

export interface RigState {
  progress: number
  layout: CameraLayout | null
}

/** The single mutable runtime handle shared by DOM overlay, canvas and machine. */
export interface StageRuntime {
  rig: RigState
  outline: OutlineTarget | null
  scene: SceneApi | null
}

export interface DebugLetter {
  id: string
  char: string
  geometryUuid: string
  position: number[]
  rotation: number[]
  visible: boolean
  scale: number[]
}

/** Dev/test surface (not UI): lets QA prove per-letter independence & shared geometry. */
export interface MortonDebugApi {
  letters(): DebugLetter[]
  rotateLetter(id: string, rotation: [number, number, number]): boolean
  setLetterVisible(id: string, visible: boolean): boolean
  resetLetters(): void
  setGroupVisible(visible: boolean): void
  info(): Record<string, unknown>
}

declare global {
  interface Window {
    __MORTON_DEBUG__?: MortonDebugApi
  }
}

export function createStage(): StageRuntime {
  return { rig: { progress: 0, layout: null }, outline: null, scene: null }
}

const _p = new THREE.Vector3()
const _o = new THREE.Vector3()
const _x = new THREE.Vector3()
const _y = new THREE.Vector3()

/**
 * Write the affine world->CSS-pixel matrix for the outline plane.
 *
 * During draw the camera is fronto-parallel, so points on one Z plane project
 * affinely; deriving the matrix from the live camera (rather than from CSS
 * assumptions) keeps the SVG hairline locked to the extruded silhouette on
 * every viewport size.
 */
/** Exact matrix for the frontal draw pose; lets the SVG run before WebGL boots. */
export function applyDrawOutlineProjection(
  outline: OutlineTarget,
  layout: CameraLayout,
  width: number,
  height: number,
): void {
  const distance = layout.draw.z - layout.outlinePlaneZ
  const scale = height / (2 * distance * Math.tan((layout.fov * Math.PI) / 360))
  const e = width / 2
  const f = height / 2 + layout.targetY * scale
  const stroke = (width < 640 ? 1.1 : 1.25) / Math.abs(scale)
  outline.root.style.setProperty('--outline-stroke', `${stroke.toFixed(6)}px`)
  outline.group.setAttribute('transform', `matrix(${scale.toFixed(4)} 0 0 ${(-scale).toFixed(4)} ${e.toFixed(3)} ${f.toFixed(3)})`)
}

export function applyOutlineProjection(stage: StageRuntime): void {
  const scene = stage.scene
  const outline = stage.outline
  const layout = stage.rig.layout
  if (!scene || !outline || !layout) return
  const { camera, gl } = scene
  const w = gl.domElement.clientWidth
  const h = gl.domElement.clientHeight
  if (!w || !h) return
  camera.updateMatrixWorld()

  const z = layout.outlinePlaneZ
  projectPx(_o.set(0, 0, z), camera, w, h)
  projectPx(_x.set(1, 0, z), camera, w, h)
  projectPx(_y.set(0, 1, z), camera, w, h)
  const a = _x.x - _o.x
  const b = _x.y - _o.y
  const c = _y.x - _o.x
  const d = _y.y - _o.y
  const stroke = (w < 640 ? 1.1 : 1.25) / Math.abs(a)
  outline.root.style.setProperty('--outline-stroke', `${stroke.toFixed(6)}px`)
  outline.group.setAttribute(
    'transform',
    `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${_o.x.toFixed(3)} ${_o.y.toFixed(3)})`,
  )
}

function projectPx(v: THREE.Vector3, camera: THREE.Camera, w: number, h: number): THREE.Vector3 {
  v.project(camera)
  v.x = (v.x + 1) * 0.5 * w
  v.y = (1 - v.y) * 0.5 * h
  return v
}
