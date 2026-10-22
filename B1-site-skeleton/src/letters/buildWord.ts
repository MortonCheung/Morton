import { useMemo } from 'react'
import * as THREE from 'three'
import { contoursToShapes, parseWord, type WordOutline } from './font'

export interface LetterSpec {
  char: string
  index: number
  outlines: WordOutline
  geometry: THREE.ExtrudeGeometry
  offsetX: number
}

export interface BuildLettersOptions {
  depth?: number
  bevel?: number
  bevelSegments?: number
  curveSegments?: number
  tracking?: number
  emSize?: number
}

/** Build one independent ExtrudeGeometry per letter, laid out on a centred baseline. */
export function buildWord(
  buffer: ArrayBuffer,
  text: string,
  opts: BuildLettersOptions = {},
): { letters: LetterSpec[]; width: number; height: number; outline: WordOutline } {
  const {
    depth = 0.26,
    bevel = 0.012,
    bevelSegments = 3,
    curveSegments = 12,
    tracking = 0.055,
    emSize = 1,
  } = opts
  const outline = parseWord(buffer, text, emSize, tracking)
  const total = outline.width
  let cursor = 0
  const letters: LetterSpec[] = []
  outline.letters.forEach((l, index) => {
    const shapes = contoursToShapes(l.contours)
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments,
      curveSegments,
      steps: 1,
    })
    geo.translate(0, 0, -depth / 2)
    letters.push({ char: l.char, index, outlines: outline, geometry: geo, offsetX: cursor - total / 2 })
    cursor += l.advance
  })
  return { letters, width: total, height: outline.capHeight, outline }
}

export function useWord(buffer: ArrayBuffer | null, text: string, opts?: BuildLettersOptions) {
  return useMemo(() => (buffer ? buildWord(buffer, text, opts) : null), [buffer, text, opts])
}
