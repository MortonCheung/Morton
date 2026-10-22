/**
 * One source of truth for camera framing and for the SVG overlay projection.
 *
 * The drawing state is an SVG layer stacked exactly on top of the WebGL canvas.
 * Both must agree pixel-for-pixel, so the same `LayoutFrame` drives the
 * orthographic frustum (three) and the world -> CSS projection (SVG). Any drift
 * between the two would show up as the outline "jumping" when the solid fades in.
 */

export interface LayoutFrame {
  cssW: number
  cssH: number
  /** orthographic frustum width in world units (1 world unit = cap height) */
  camW: number
  camH: number
  camY: number
  /** word ink width as a fraction of viewport width */
  wordFill: number
  /** word visual centre as a fraction of viewport height */
  centerY: number
  dpr: number
  tier: 'mobile' | 'tablet' | 'desktop'
  /** pixel rows the letter ink occupies, for precise DOM typography alignment */
  wordTop: number
  wordBottom: number
  wordHeight: number
}

export interface WordBox {
  width: number
  height: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function fillFor(width: number): number {
  if (width < 520) return 0.92
  if (width < 820) return 0.86
  if (width < 1100) return 0.8
  if (width < 1450) return 0.72
  return 0.66
}

function centerFor(width: number): number {
  if (width < 520) return 0.44
  if (width < 820) return 0.455
  return 0.475
}

export function computeFrame(cssW: number, cssH: number, word: WordBox): LayoutFrame {
  const w = Math.max(1, cssW)
  const h = Math.max(1, cssH)
  const aspect = w / h
  const wordFill = fillFor(w)
  const centerY = centerFor(w)
  const camW = word.width / wordFill
  const camH = camW / aspect
  const camY = (centerY - 0.5) * camH

  // Supersample a little even on 1x displays: a thin polished chamfer against a
  // dark ground is the worst case for MSAA, so render 1.5x and let the browser
  // downsample. Mobile caps lower to protect the 8GB / parallel-prototype budget.
  const dprCap = w < 820 ? 1.75 : 2
  const base = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const dpr = clamp(base * 1.5, 1, dprCap)

  const toScreenY = (worldY: number) => h / 2 - ((worldY - camY) / camH) * h
  const wordTop = toScreenY(word.height / 2)
  const wordBottom = toScreenY(-word.height / 2)

  return {
    cssW: w,
    cssH: h,
    camW,
    camH,
    camY,
    wordFill,
    centerY,
    dpr,
    tier: w < 820 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop',
    wordTop,
    wordBottom,
    wordHeight: wordBottom - wordTop,
  }
}
