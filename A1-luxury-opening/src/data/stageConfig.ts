/**
 * Art direction constants — the single place to re-tune the object.
 *
 * Everything the eye reads as "design" lives here: lens, framing, material,
 * light levels and opening rhythm. Components read these values instead of
 * hard-coding magic numbers, so a re-tune is a diff of this file.
 */
import { OUTLINE } from './outline.generated'

export const WORD = OUTLINE.word

const deg = (d: number) => (d * Math.PI) / 180

export const CAMERA = {
  fov: 26,
  near: 0.1,
  far: 140,
  /** how much of the viewport width the ink should occupy, by breakpoint */
  widthFraction: { wide: 0.6, desktop: 0.66, small: 0.7, mobile: 0.84 },
  /** vertical centre of the wordmark, 0.475 = slightly above optical centre */
  centerYFraction: 0.47,
  /** dolly-in during the reveal (fraction of the drawing distance) */
  revealDolly: 0.06,
  /** hero-side orbit: enough to reveal the extrude walls, never a turntable */
  heroYawDeg: 10,
  heroElevationDeg: 1.6,
  /** almost imperceptible idle drift after the hero settles */
  idleYawDeg: 0.5,
  idleElevationDeg: 0.22,
  idlePeriodMs: 14000,
  /** pointer parallax, only on fine pointers, in degrees */
  pointerYawDeg: 0.22,
  pointerElevationDeg: 0.16,
} as const

export const FRAMING = {
  wordCenterY: OUTLINE.centerY,
  inkWidth: OUTLINE.ink.maxX - OUTLINE.ink.minX,
  pixelRatioCap: 2,
  floorY: -0.38,
} as const

export const MATERIAL = {
  color: '#c6c7c6',
  metalness: 1,
  roughness: 0.26,
  envMapIntensity: 1,
  /** roughness variation so the satin surface is not a perfect CG gradient */
  roughnessVariation: 0.14,
  clearcoat: 0,
} as const

export const LIGHTING = {
  keyColor: 0xfff3e6,
  keyIntensity: 5.6,
  rimColor: 0xd9dfe9,
  rimIntensity: 3.0,
  fillColor: 0xffe8d0,
  fillIntensity: 0.1,
  /** scene.environmentIntensity at full reveal */
  environmentIntensity: 1.25,
  /** the room is already lit while the line art is being drawn */
  base: { key: 0.5, rim: 0.3, fill: 0.55, environment: 0.2 },
  exposure: 1.0,
  fogColor: 0x0b0a09,
  fogDensity: 0.05,
} as const

/** Opening rhythm. Timings are seconds; measured ms go into window.__MORTON__. */
export const TIMING = {
  lead: 0.03,
  contour: 0.22,
  contourStagger: 0.05,
  letterStagger: 0.17,
  /** held after the last contour so the built state reads as a state, not a frame */
  settle: 0.08,
  expand: 0.56,
  expandLetter: 0.44,
  expandLetterStagger: 0.018,
  heroDrift: 2.4,
} as const

export const COLORS = {
  outline: '#d9c8ae',
  outlineOpacity: 0.92,
  progress: 'rgba(233, 218, 194, 0.34)',
} as const

export const CAMERA_DEG = { heroYaw: deg(CAMERA.heroYawDeg), heroElevation: deg(CAMERA.heroElevationDeg) } as const
