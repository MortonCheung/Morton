/** Shared types for the A1 opening. Kept free of three.js / React so that the
 *  offline outline generator can import them with plain Node. */

export type OpeningPhase = 'loading' | 'drawing' | 'built' | 'expanding' | 'hero' | 'reduced'

/** One drawable contour of a glyph, already flattened into an SVG path in glyph
 *  coordinates (em units, y-up, baseline = 0). */
export interface OutlineContour {
  d: string
  /** absolute area in em², used to draw the outer contour before its counter */
  area: number
}

export interface OutlineLetter {
  id: string
  char: string
  index: number
  /** x offset from the centre of the word, in em units */
  offsetX: number
  advance: number
  contours: OutlineContour[]
}

export interface WordOutlineData {
  word: string
  emSize: number
  tracking: number
  /** total advance width of the word */
  width: number
  /** ink bounds of the whole word, baseline-relative (y-up) */
  ink: { minX: number; maxX: number; minY: number; maxY: number }
  /** centre of the ink box; the 3D group is translated by -centerY */
  centerY: number
  capHeight: number
  letters: OutlineLetter[]
}

export interface RunTimings {
  run: number
  drawingAt: number
  builtAt: number
  expandingAt: number
  heroAt: number
  drawMs: number
  expandMs: number
  totalMs: number
}

export interface QualityTier {
  name: 'desktop' | 'mobile'
  maxDpr: number
  shadowMapSize: number
  curveSegments: number
  bevelSegments: number
}
