import opentype from 'opentype.js'
import * as THREE from 'three'

/**
 * TTF -> vector contours.
 *
 * The exact same contour data feeds two consumers:
 *   1. `buildWord` -> ExtrudeGeometry (the solid hero letters)
 *   2. `buildDrawPaths` -> SVG path data (the drawing state)
 *
 * Deriving both from one parse is what keeps the drawn outline and the extruded
 * silhouette on the same coordinates. Nothing here is a hand-traced approximation.
 */

type Seg =
  | { t: 'L'; x: number; y: number }
  | { t: 'Q'; x1: number; y1: number; x: number; y: number }
  | { t: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }

export interface Contour {
  start: THREE.Vector2
  segs: Seg[]
  closed: boolean
}

export interface LetterOutline {
  char: string
  /** baseline advance including tracking, in world units */
  advance: number
  contours: Contour[]
}

export interface WordOutline {
  letters: LetterOutline[]
  capHeight: number
  width: number
}

const normChar = (s: string) => s.replace(/\s/g, '').toUpperCase()

/** cap height as a fraction of the em (Jost: 0.700) */
export function readCapHeightEm(buffer: ArrayBuffer): number {
  const font = opentype.parse(buffer)
  const upem = font.unitsPerEm || 1000
  const cap = font.tables.os2?.sCapHeight || (font.ascender as number)
  const ratio = cap / upem
  return Math.min(0.88, Math.max(0.5, ratio))
}

/**
 * Parse `text` into per-letter contours, y-up, baseline at y = 0.
 * `trackingEm` is expressed in em and scaled with `emSize` so spacing stays
 * proportional when the word is normalised to a 1.0 cap height.
 */
export function parseWord(buffer: ArrayBuffer, text: string, emSize = 1, trackingEm = 0): WordOutline {
  const font = opentype.parse(buffer)
  const s = emSize / font.unitsPerEm
  const chars = [...text]
  const letters: LetterOutline[] = []
  let x = 0
  for (const ch of chars) {
    const glyph = font.charToGlyph(normChar(ch))
    const contours: Contour[] = []
    let cur: Contour | null = null
    for (const c of glyph.path.commands) {
      if (c.type === 'M') {
        cur = { start: new THREE.Vector2((c.x ?? 0) * s, (c.y ?? 0) * s), segs: [], closed: false }
        contours.push(cur)
      } else if (c.type === 'Z') {
        if (cur) cur.closed = true
      } else if (cur) {
        if (c.type === 'L') cur.segs.push({ t: 'L', x: (c.x ?? 0) * s, y: (c.y ?? 0) * s })
        else if (c.type === 'Q')
          cur.segs.push({
            t: 'Q',
            x1: (c.x1 ?? 0) * s,
            y1: (c.y1 ?? 0) * s,
            x: (c.x ?? 0) * s,
            y: (c.y ?? 0) * s,
          })
        else if (c.type === 'C')
          cur.segs.push({
            t: 'C',
            x1: (c.x1 ?? 0) * s,
            y1: (c.y1 ?? 0) * s,
            x2: (c.x2 ?? 0) * s,
            y2: (c.y2 ?? 0) * s,
            x: (c.x ?? 0) * s,
            y: (c.y ?? 0) * s,
          })
      }
    }
    const advance = ((glyph.advanceWidth ?? 0) / font.unitsPerEm) * emSize + trackingEm * emSize
    letters.push({ char: ch, advance, contours })
    x += advance
  }
  const capHeight = ((font.tables.os2?.sCapHeight ?? font.ascender) / font.unitsPerEm) * emSize
  return { letters, capHeight, width: x }
}

function contourPoints(c: Contour, curveSegments = 24): THREE.Vector2[] {
  const path = new THREE.Path()
  path.moveTo(c.start.x, c.start.y)
  for (const s of c.segs) {
    if (s.t === 'L') path.lineTo(s.x, s.y)
    else if (s.t === 'Q') path.quadraticCurveTo(s.x1, s.y1, s.x, s.y)
    else path.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
  }
  path.closePath()
  return path.getPoints(curveSegments)
}

export function contourArea(c: Contour): number {
  const pts = contourPoints(c, 12)
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

function pointInPolygon(p: THREE.Vector2, poly: THREE.Vector2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Build filled THREE.Shape objects (holes included) from a letter's contours. */
export function contoursToShapes(contours: Contour[]): THREE.Shape[] {
  const items = contours.map((c) => {
    const pts = contourPoints(c, 24)
    const area = Math.abs(contourArea(c))
    return { c, pts, area }
  })
  items.sort((a, b) => b.area - a.area)

  const shapeOf = (item: (typeof items)[number]) => {
    const sh = new THREE.Shape()
    sh.moveTo(item.c.start.x, item.c.start.y)
    for (const s of item.c.segs) {
      if (s.t === 'L') sh.lineTo(s.x, s.y)
      else if (s.t === 'Q') sh.quadraticCurveTo(s.x1, s.y1, s.x, s.y)
      else sh.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
    }
    sh.closePath()
    return sh
  }

  const used = new Set<number>()
  const shapes: THREE.Shape[] = []
  items.forEach((item, i) => {
    if (used.has(i)) return
    const outer = shapeOf(item)
    used.add(i)
    items.forEach((other, j) => {
      if (used.has(j) || other.area >= item.area) return
      if (pointInPolygon(other.pts[0], item.pts)) {
        const hole = new THREE.Path()
        hole.moveTo(other.c.start.x, other.c.start.y)
        for (const s of other.c.segs) {
          if (s.t === 'L') hole.lineTo(s.x, s.y)
          else if (s.t === 'Q') hole.quadraticCurveTo(s.x1, s.y1, s.x, s.y)
          else hole.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x, s.y)
        }
        hole.closePath()
        outer.holes.push(hole)
        used.add(j)
      }
    })
    shapes.push(outer)
  })
  return shapes
}
