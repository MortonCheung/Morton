import * as THREE from 'three'
import { contourToPathData, contoursToShapes, parseWord, type WordOutline } from './font'
import { OPENING } from '../lib/openingConfig'

/**
 * One independently controllable letter.
 *
 * `geometry` is shared by glyph: both O meshes point at the *same*
 * ExtrudeGeometry instance (explicit acceptance criterion) while their
 * Object3D transforms stay independent.
 */
export interface LetterSpec {
  id: string
  char: string
  index: number
  /** World X of the glyph's placement origin, word centred on 0. */
  offsetX: number
  /** Ink-bbox centre in glyph space; the geometry is translated by -centerX. */
  centerX: number
  /** SVG path data per contour (outer + counters) in glyph units, y-up. */
  paths: string[]
  geometry: THREE.ExtrudeGeometry
}

export interface WordBuild {
  letters: LetterSpec[]
  outline: WordOutline
  width: number
  capHeight: number
  depth: number
  /** Unique glyph -> geometry. Ownership map; disposed exactly once by the owner. */
  geometries: Map<string, THREE.ExtrudeGeometry>
}

export interface BuildLettersOptions {
  depth?: number
  bevel?: number
  bevelSegments?: number
  curveSegments?: number
  tracking?: number
  emSize?: number
}

/**
 * Build one independent ExtrudeGeometry per *glyph* and place one mesh per
 * letter. Geometry is centred horizontally on its ink bbox (so single-letter
 * rotation has a sane pivot) and vertically on the cap height (shared baseline
 * is preserved).
 */
export function buildWord(buffer: ArrayBuffer, text: string, opts: BuildLettersOptions = {}): WordBuild {
  const {
    depth = OPENING.depth,
    bevel = OPENING.bevel,
    bevelSegments = OPENING.bevelSegments,
    curveSegments = OPENING.curveSegments,
    tracking = OPENING.tracking,
    emSize = 1,
  } = opts
  const outline = parseWord(buffer, text, emSize, tracking)
  const capHeight = outline.capHeight
  const total = outline.width

  const geometries = new Map<string, THREE.ExtrudeGeometry>()
  const centerXs = new Map<string, number>()
  const pathsByChar = new Map<string, string[]>()

  for (const letter of outline.letters) {
    if (geometries.has(letter.char)) continue
    const shapes = contoursToShapes(letter.contours)
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments,
      curveSegments,
      steps: 1,
    })
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    const centerX = box ? (box.min.x + box.max.x) / 2 : 0
    // Keep the shared baseline: vertical centring uses cap height, never the
    // per-glyph bbox (O overshoots above cap height and below baseline).
    geometry.translate(-centerX, -capHeight / 2, -depth / 2)
    geometry.computeBoundingSphere()
    geometries.set(letter.char, geometry)
    centerXs.set(letter.char, centerX)
    pathsByChar.set(letter.char, letter.contours.map(contourToPathData))
  }

  let cursor = 0
  const letters: LetterSpec[] = outline.letters.map((letter, index) => {
    const offsetX = cursor - total / 2
    cursor += letter.advance
    const geometry = geometries.get(letter.char)
    const centerX = centerXs.get(letter.char)
    const paths = pathsByChar.get(letter.char)
    if (!geometry || centerX === undefined || !paths) throw new Error(`missing geometry for ${letter.char}`)
    return { id: `${letter.char}-${index}`, char: letter.char, index, offsetX, centerX, paths, geometry }
  })

  // Advance width includes tracking and side bearings, so centre on the ink
  // bbox instead — otherwise the wordmark sits visibly off-centre on mobile.
  let inkMin = Infinity
  let inkMax = -Infinity
  for (const letter of letters) {
    const box = letter.geometry.boundingBox
    if (!box) continue
    inkMin = Math.min(inkMin, box.min.x + letter.offsetX + letter.centerX)
    inkMax = Math.max(inkMax, box.max.x + letter.offsetX + letter.centerX)
  }
  if (Number.isFinite(inkMin) && Number.isFinite(inkMax)) {
    const shift = -((inkMin + inkMax) / 2)
    for (const letter of letters) letter.offsetX += shift
  }

  return { letters, outline, width: total, capHeight, depth, geometries }
}
