import * as THREE from 'three'
import { contoursToShapes, layoutWord, parseWord, type WordOutline } from './font'

export interface LetterSpec {
  id: string
  char: string
  index: number
  /** x offset from the centre of the word (em units) */
  offsetX: number
  /** glyph outlines, shared word data (read-only) */
  outlines: WordOutline
  geometry: THREE.ExtrudeGeometry
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
 * Rewrite the UVs so each glyph gets 0..1 across its own bounding box.
 *
 * ExtrudeGeometry's default UVs are world-space (x, y) for the caps, which
 * makes any texture tile across the word instead of describing one letter.
 * Normalising per glyph lets a smooth gradient (not noise) drive the face
 * sheen — see scenes/proceduralTextures.ts.
 */
function normalizeLetterUV(geometry: THREE.ExtrudeGeometry): void {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute | undefined
  if (!box || !uv) return
  const width = Math.max(box.max.x - box.min.x, 1e-6)
  const height = Math.max(box.max.y - box.min.y, 1e-6)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (position.getX(i) - box.min.x) / width, (position.getY(i) - box.min.y) / height)
  }
  uv.needsUpdate = true
}

/**
 * Build one independent ExtrudeGeometry per *glyph* and lay the word out with
 * the shared layout routine.
 *
 * Ownership: the returned geometries are owned by the caller (OpeningScene).
 * Two letters with the same glyph (the two O's) point at the same geometry
 * instance, so the scene disposes geometries through a Set, never per mesh.
 */
export function buildWord(
  buffer: ArrayBuffer,
  text: string,
  opts: BuildLettersOptions = {},
): { letters: LetterSpec[]; width: number; height: number; outline: WordOutline } {
  const {
    depth = 0.2,
    bevel = 0.013,
    bevelSegments = 4,
    curveSegments = 16,
    tracking = 0.07,
    emSize = 1,
  } = opts
  const outline = parseWord(buffer, text, emSize, tracking)
  const layout = layoutWord(outline)

  const byGlyph = new Map<string, THREE.ExtrudeGeometry>()
  const letters: LetterSpec[] = layout.letters.map((placed, index) => {
    const source = outline.letters[index]
    let geometry = byGlyph.get(source.char)
    if (!geometry) {
      const shapes = contoursToShapes(source.contours)
      geometry = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments,
        curveSegments,
        steps: 1,
      })
      geometry.translate(0, 0, -depth / 2)
      geometry.computeVertexNormals()
      normalizeLetterUV(geometry)
      byGlyph.set(source.char, geometry)
    }
    return {
      id: `${source.char}-${index}`,
      char: source.char,
      index,
      offsetX: placed.offsetX,
      outlines: outline,
      geometry,
    }
  })

  return { letters, width: layout.width, height: outline.capHeight, outline }
}
