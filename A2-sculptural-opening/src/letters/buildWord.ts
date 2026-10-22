import * as THREE from 'three'
import { contoursToShapes, contourPoints, parseWord, type Contour, type WordOutline } from './font'

export interface LetterSpec {
  char: string
  index: number
  /** Shared for repeated glyphs: both O meshes reference the exact same instance. */
  geometry: THREE.ExtrudeGeometry
  /** The font contours this letter's geometry was built from (same source for the line art). */
  contours: Contour[]
  offsetX: number
  advance: number
}

export interface BuiltWord {
  letters: LetterSpec[]
  /** Every distinct glyph geometry, each to be disposed exactly once. */
  uniqueGeometries: THREE.ExtrudeGeometry[]
  /** Advance-based width including tracking. */
  width: number
  /** Visual cap height of the tallest glyph. */
  height: number
  minY: number
  depth: number
  outline: WordOutline
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
 * Build one independent ExtrudeGeometry per *glyph*, laid out on a centred baseline.
 *
 * Repeated characters (the two O's) share a single geometry instance. The caller owns
 * `uniqueGeometries` and must dispose each item once — never per mesh.
 */
export function buildWord(
  buffer: ArrayBuffer,
  text: string,
  opts: BuildLettersOptions = {},
): BuiltWord {
  const {
    depth = 0.3,
    bevel = 0.016,
    bevelSegments = 4,
    curveSegments = 16,
    tracking = 0.06,
    emSize = 1,
  } = opts

  const outline = parseWord(buffer, text, emSize, tracking)
  const glyphs = new Map<string, THREE.ExtrudeGeometry>()

  const geometryFor = (contours: Contour[]): THREE.ExtrudeGeometry => {
    const shapes = contoursToShapes(contours)
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments,
      curveSegments,
      steps: 1,
    })
    // Put the extrusion centre on z = 0 so growth can advance from a pinned back face.
    geo.translate(0, 0, -depth / 2)
    geo.computeBoundingBox()
    return geo
  }

  // width = sum(advance) minus the trailing tracking that follows the last letter
  const width = outline.letters.reduce((sum, l) => sum + l.advance, 0) - tracking

  let cursor = -width / 2
  let minY = Infinity
  let maxY = -Infinity

  const letters: LetterSpec[] = outline.letters.map((letter, index) => {
    let geo = glyphs.get(letter.char)
    if (!geo) {
      geo = geometryFor(letter.contours)
      glyphs.set(letter.char, geo)
    }
    const box = geo.boundingBox
    if (box) {
      minY = Math.min(minY, box.min.y)
      maxY = Math.max(maxY, box.max.y)
    }
    const spec: LetterSpec = {
      char: letter.char,
      index,
      geometry: geo,
      contours: letter.contours,
      offsetX: cursor,
      advance: letter.advance,
    }
    cursor += letter.advance
    return spec
  })

  return {
    letters,
    uniqueGeometries: [...glyphs.values()],
    width,
    height: Number.isFinite(maxY - minY) ? maxY - minY : outline.capHeight,
    minY: Number.isFinite(minY) ? minY : 0,
    depth,
    outline,
  }
}

/**
 * Closed 2D loops for the same contours the extrude geometry was built from.
 * Used for the construction line art: there is no second outline source.
 */
export function contourLoops(contours: Contour[], curveSegments = 40): THREE.Vector2[][] {
  return contours.map((c) => {
    const pts = contourPoints(c, curveSegments)
    if (pts.length > 1) {
      const first = pts[0]
      const last = pts[pts.length - 1]
      if (first.distanceToSquared(last) > 1e-10) pts.push(first.clone())
    }
    return pts
  })
}
