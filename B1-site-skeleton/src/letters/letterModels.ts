import * as THREE from 'three'
import { buildWord } from './buildWord'
import { contourPoints } from './font'
import type { LetterId } from '../data/chapters'

/**
 * Six independent letter objects.
 *
 * Ownership rules:
 *  - Glyph geometry is shared per character: both O letters use the SAME
 *    BufferGeometry instance (required) and get their own mesh/transform.
 *  - Each mesh owns its material; each outline owns its geometry + material.
 *  - `dispose()` is the single owner that frees geometry, materials and line
 *    buffers exactly once. Nothing else may dispose these resources.
 */
export interface LetterModel {
  id: LetterId
  char: string
  /** X of the glyph's visual centre on the centred word baseline (world units). */
  baseX: number
  mesh: THREE.Mesh
  outline: THREE.LineSegments
  meshMat: THREE.MeshStandardMaterial
  lineMat: THREE.LineBasicMaterial
  /** Number of line segments in the outline (for progressive draw-on). */
  outlineSegments: number
}

export interface LetterSet {
  models: LetterModel[]
  /** Full word width in world units. */
  width: number
  /** Cap height in world units. */
  capHeight: number
  dispose: () => void
}

export const LETTER_IDS: LetterId[] = ['M', 'O1', 'R', 'T', 'O2', 'N']
const WORD = 'MORTON'

const INK = new THREE.Color('#1b1813')
export const PAPER_GHOST = new THREE.Color('#e6dfd1')

export function setOutlineProgress(model: LetterModel, progress: number): void {
  const total = model.outlineSegments * 2
  const count = Math.round(total * Math.min(1, Math.max(0, progress)))
  model.outline.geometry.setDrawRange(0, count)
  model.outline.visible = count > 0
}

/** Build the six letters from the raw font buffer. Font buffer is borrowed, not owned. */
export function createLetterSet(buffer: ArrayBuffer): LetterSet {
  const built = buildWord(buffer, WORD, {
    depth: 0.24,
    bevel: 0.009,
    bevelSegments: 3,
    curveSegments: 10,
    tracking: 0.06,
    emSize: 1,
  })

  const capHeight = built.outline.capHeight
  const capCenterY = capHeight / 2
  const shared = new Map<string, { geometry: THREE.BufferGeometry; cx: number }>()
  const ownGeometries = new Set<THREE.BufferGeometry>()

  interface Placement {
    spec: (typeof built.letters)[number]
    geometry: THREE.BufferGeometry
    cx: number
    left: number
    right: number
  }

  const placements: Placement[] = built.letters.map((spec) => {
    const existing = shared.get(spec.char)
    if (existing) {
      // Same glyph: both O letters must share the first instance.
      spec.geometry.dispose()
      const bb = existing.geometry.boundingBox!
      // Bounds are stored in translated geometry space; convert back to the
      // original pen space before laying the letter out.
      const minX = bb.min.x + existing.cx
      const maxX = bb.max.x + existing.cx
      return { spec, geometry: existing.geometry, cx: existing.cx, left: spec.offsetX + minX, right: spec.offsetX + maxX }
    }
    const geometry = spec.geometry
    geometry.computeBoundingBox()
    const bb = geometry.boundingBox!
    const cx = (bb.min.x + bb.max.x) / 2
    const minX = bb.min.x
    const maxX = bb.max.x
    geometry.translate(-cx, -capCenterY, 0)
    geometry.computeBoundingBox()
    shared.set(spec.char, { geometry, cx })
    ownGeometries.add(geometry)
    return { spec, geometry, cx, left: spec.offsetX + minX, right: spec.offsetX + maxX }
  })

  const left = Math.min(...placements.map((p) => p.left))
  const right = Math.max(...placements.map((p) => p.right))
  const wordCenter = (left + right) / 2

  const models: LetterModel[] = []

  placements.forEach((placed, i) => {
    const id = LETTER_IDS[i]
    if (!id) return
    const baseX = (placed.left + placed.right) / 2 - wordCenter

    const meshMat = new THREE.MeshStandardMaterial({
      color: INK.clone(),
      roughness: 0.62,
      metalness: 0.06,
      envMapIntensity: 0.45,
    })
    const mesh = new THREE.Mesh(placed.geometry, meshMat)
    mesh.position.set(baseX, 0, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = `letter-${id}`

    const positions: number[] = []
    let segments = 0
    for (const contour of placed.spec.outlines.letters[i].contours) {
      const pts = contourPoints(contour, 20)
      if (pts.length < 2) continue
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k]
        const b = pts[(k + 1) % pts.length]
        positions.push(a.x - placed.cx, a.y - capCenterY, 0.001, b.x - placed.cx, b.y - capCenterY, 0.001)
        segments++
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    lineGeo.setDrawRange(0, 0)
    const lineMat = new THREE.LineBasicMaterial({
      color: INK.clone(),
      transparent: true,
      opacity: 0.92,
      depthTest: true,
      depthWrite: false,
    })
    const outline = new THREE.LineSegments(lineGeo, lineMat)
    outline.position.set(baseX, 0, 0)
    outline.frustumCulled = false
    outline.name = `letter-outline-${id}`

    models.push({
      id,
      char: placed.spec.char,
      baseX,
      mesh,
      outline,
      meshMat,
      lineMat,
      outlineSegments: segments,
    })
  })

  const dispose = () => {
    for (const geometry of ownGeometries) geometry.dispose()
    ownGeometries.clear()
    for (const model of models) {
      model.meshMat.dispose()
      model.outline.geometry.dispose()
      model.lineMat.dispose()
    }
    models.length = 0
  }

  return { models, width: right - left, capHeight, dispose }
}
