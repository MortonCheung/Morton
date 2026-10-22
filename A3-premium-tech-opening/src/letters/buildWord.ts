import * as THREE from 'three'
import { contoursToShapes, parseWord, readCapHeightEm, type Contour } from './font'

/**
 * Geometry ownership
 * ------------------
 * Exactly one ExtrudeGeometry is created per *unique glyph*. MORTON has six
 * letters but five unique glyphs, so the two O meshes reference the identical
 * BufferGeometry instance while keeping independent transforms. `glyphs` is the
 * single owner of those geometries: the letter list never owns or disposes them,
 * so unmounting one letter can never free geometry the other O still renders.
 */

export interface BuildOptions {
  /** extrusion depth in cap-height units */
  depth?: number
  /** bevel size / thickness in cap-height units */
  bevel?: number
  bevelSegments?: number
  curveSegments?: number
  /** letter spacing in em */
  trackingEm?: number
  /** target cap height in world units */
  capHeight?: number
  /** optical pair kerning in em, keyed by "MN" */
  kerningEm?: Record<string, number>
}

export interface WordLetter {
  /** stable id, e.g. "O-1" and "O-4" */
  id: string
  index: number
  char: string
  /** glyph key -> ExtrudeGeometry, shared between identical characters */
  glyphKey: string
  /** world x of the glyph origin, word optically centred on x = 0 */
  x: number
  /** world y of the baseline (identical for every letter) */
  y: number
  advance: number
  contours: Contour[]
}

export interface WordBuild {
  text: string
  letters: WordLetter[]
  /** unique geometry per glyph — the single owner */
  glyphs: Map<string, THREE.ExtrudeGeometry>
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
  capHeight: number
  uniqueGlyphs: number
  meshes: number
}

export function buildWord(buffer: ArrayBuffer, text: string, opts: BuildOptions = {}): WordBuild {
  const {
    depth = 0.22,
    bevel = 0.014,
    bevelSegments = 5,
    curveSegments = 20,
    trackingEm = 0.08,
    capHeight = 1,
    kerningEm = {},
  } = opts

  const capEm = readCapHeightEm(buffer)
  const emSize = capHeight / capEm
  const outline = parseWord(buffer, text, emSize, trackingEm)

  const glyphs = new Map<string, THREE.ExtrudeGeometry>()
  for (const letter of outline.letters) {
    if (glyphs.has(letter.char)) continue
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
    // centre the slab on z = 0 so depth animation never shifts the front face
    geometry.translate(0, 0, -depth / 2)
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    glyphs.set(letter.char, geometry)
  }

  let cursor = 0
  const raw = outline.letters.map((letter, index) => {
    if (index > 0) {
      const pair = `${outline.letters[index - 1].char}${letter.char}`
      cursor += (kerningEm[pair] ?? 0) * emSize
    }
    const item = {
      id: `${letter.char}-${index}`,
      index,
      char: letter.char,
      glyphKey: letter.char,
      x: cursor,
      advance: letter.advance,
      contours: letter.contours,
    }
    cursor += letter.advance
    return item
  })

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const item of raw) {
    const bb = glyphs.get(item.glyphKey)!.boundingBox!
    minX = Math.min(minX, bb.min.x + item.x)
    maxX = Math.max(maxX, bb.max.x + item.x)
    minY = Math.min(minY, bb.min.y)
    maxY = Math.max(maxY, bb.max.y)
  }
  const originX = -(minX + maxX) / 2
  const originY = -(minY + maxY) / 2

  const letters: WordLetter[] = raw.map((item) => ({
    ...item,
    id: item.id,
    x: item.x + originX,
    y: originY,
  }))

  return {
    text,
    letters,
    glyphs,
    bounds: {
      minX: minX + originX,
      maxX: maxX + originX,
      minY: minY + originY,
      maxY: maxY + originY,
      width: maxX - minX,
      height: maxY - minY,
    },
    capHeight,
    uniqueGlyphs: glyphs.size,
    meshes: letters.length,
  }
}

/** Release the geometry owner. Only call when no mesh references these geometries. */
export function disposeWord(build: WordBuild): void {
  for (const geometry of build.glyphs.values()) geometry.dispose()
  build.glyphs.clear()
}
