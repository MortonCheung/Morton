import type { WordBuild } from '../../letters/buildWord'
import { contourArea, type Contour } from '../../letters/font'
import type { LayoutFrame } from '../../lib/frame'

/**
 * World -> CSS projection.
 *
 * The 3D camera is orthographic and the SVG layer has a viewBox of exactly
 * `cssW x cssH`, so one world unit maps linearly to pixels. The mapping is the
 * same algebra the orthographic frustum uses — no eyeballed offsets.
 */

export interface DrawPath {
  key: string
  letterIndex: number
  char: string
  pathIndex: number
  d: string
}

const n = (v: number) => {
  const s = v.toFixed(2)
  return s === '-0.00' ? '0.00' : s
}

function contourToPath(contour: Contour, x: number, y: number, project: (wx: number, wy: number) => [string, string]) {
  const parts: string[] = []
  const [sx, sy] = project(contour.start.x + x, contour.start.y + y)
  parts.push(`M${sx} ${sy}`)
  for (const seg of contour.segs) {
    if (seg.t === 'L') {
      const [px, py] = project(seg.x + x, seg.y + y)
      parts.push(`L${px} ${py}`)
    } else if (seg.t === 'Q') {
      const [c1x, c1y] = project(seg.x1 + x, seg.y1 + y)
      const [px, py] = project(seg.x + x, seg.y + y)
      parts.push(`Q${c1x} ${c1y} ${px} ${py}`)
    } else {
      const [c1x, c1y] = project(seg.x1 + x, seg.y1 + y)
      const [c2x, c2y] = project(seg.x2 + x, seg.y2 + y)
      const [px, py] = project(seg.x + x, seg.y + y)
      parts.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${px} ${py}`)
    }
  }
  parts.push('Z')
  return parts.join('')
}

export interface ShadowPath {
  letterIndex: number
  char: string
  d: string
}

/** Same projection, filled instead of stroked: an art-directed soft contact shadow. */
export function buildShadowPaths(build: WordBuild, frame: LayoutFrame): ShadowPath[] {
  const sx = frame.cssW / frame.camW
  const sy = -frame.cssH / frame.camH
  const tx = frame.cssW / 2
  const ty = frame.cssH / 2 + (frame.camY * frame.cssH) / frame.camH
  const project = (wx: number, wy: number): [string, string] => [n(tx + wx * sx), n(ty + wy * sy)]
  return build.letters.map((letter) => ({
    letterIndex: letter.index,
    char: letter.char,
    d: letter.contours.map((contour) => contourToPath(contour, letter.x, letter.y, project)).join(''),
  }))
}

export function buildDrawPaths(build: WordBuild, frame: LayoutFrame): DrawPath[] {
  const sx = frame.cssW / frame.camW
  const sy = -frame.cssH / frame.camH
  const tx = frame.cssW / 2
  const ty = frame.cssH / 2 + (frame.camY * frame.cssH) / frame.camH
  const project = (wx: number, wy: number): [string, string] => [n(tx + wx * sx), n(ty + wy * sy)]

  const out: DrawPath[] = []
  for (const letter of build.letters) {
    // outer contour first, counters (O, R) after it — a plotter pass, not a fill
    const contours = letter.contours
      .map((contour, index) => ({ contour, index, area: Math.abs(contourArea(contour)) }))
      .sort((a, b) => b.area - a.area)
    contours.forEach((item, pathIndex) => {
      out.push({
        key: `${letter.id}-${item.index}`,
        letterIndex: letter.index,
        char: letter.char,
        pathIndex,
        d: contourToPath(item.contour, letter.x, letter.y, project),
      })
    })
  }
  return out
}
