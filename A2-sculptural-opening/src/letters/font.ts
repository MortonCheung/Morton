import opentype from 'opentype.js'
import * as THREE from 'three'

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
  advance: number
  contours: Contour[]
}

export interface WordOutline {
  letters: LetterOutline[]
  capHeight: number
  width: number
  height: number
}

const norm = (s: string) => s.replace(/\s/g, '').toUpperCase()

/** Parse a TTF/OTF buffer and return per-letter vector outlines in em units (y-up). */
export function parseWord(buffer: ArrayBuffer, text: string, emSize = 1, tracking = 0): WordOutline {
  const font = opentype.parse(buffer)
  const s = emSize / font.unitsPerEm
  const chars = [...text]
  const letters: LetterOutline[] = []
  let x = 0
  for (const ch of chars) {
    const glyph = font.charToGlyph(norm(ch))
    const local = glyph.path.commands
    const contours: Contour[] = []
    let cur: Contour | null = null
    for (const c of local) {
      if (c.type === 'M') {
        cur = { start: new THREE.Vector2((c.x ?? 0) * s, (c.y ?? 0) * s), segs: [], closed: false }
        contours.push(cur)
      } else if (c.type === 'Z') {
        if (cur) cur.closed = true
      } else if (cur) {
        if (c.type === 'L') cur.segs.push({ t: 'L', x: (c.x ?? 0) * s, y: (c.y ?? 0) * s })
        else if (c.type === 'Q')
          cur.segs.push({ t: 'Q', x1: (c.x1 ?? 0) * s, y1: (c.y1 ?? 0) * s, x: (c.x ?? 0) * s, y: (c.y ?? 0) * s })
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
    letters.push({ char: ch, advance: ((glyph.advanceWidth ?? 0) / font.unitsPerEm) * emSize + tracking, contours })
    x += letters[letters.length - 1].advance
  }
  const capHeight = (font.tables.os2?.sCapHeight ?? font.ascender) * s
  return { letters, capHeight, width: x, height: capHeight }
}

function contourArea(c: Contour): number {
  const pts = contourPoints(c, 12)
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function contourPoints(c: Contour, curveSegments = 24): THREE.Vector2[] {
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

/** Build filled THREE.Shape objects (with holes) from contours. */
export function contoursToShapes(contours: Contour[]): THREE.Shape[] {
  const items = contours.map((c) => {
    const pts = contourPoints(c, 24)
    return { c, pts, area: Math.abs(contourArea(c)), sign: contourArea(c) }
  })
  items.sort((a, b) => b.area - a.area)
  const shapes: THREE.Shape[] = []
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
  items.forEach((item, i) => {
    if (used.has(i)) return
    const outer = shapeOf(item)
    used.add(i)
    // any smaller contour fully inside this one becomes a hole
    items.forEach((other, j) => {
      if (used.has(j)) return
      if (other.area >= item.area) return
      const probe = other.pts[0]
      if (pointInPolygon(probe, item.pts)) {
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
