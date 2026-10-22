import { CAMERA, FRAMING } from '../data/stageConfig'

export interface FrameInfo {
  cssWidth: number
  cssHeight: number
  /** CSS pixels per world unit on the z=0 plane */
  k: number
  /** distance from the camera to the z=0 plane at the drawing pose */
  dist: number
  /** camera height at the drawing pose (level camera) */
  camY: number
  visibleHeight: number
}

const deg = (d: number) => (d * Math.PI) / 180

/**
 * Framing is derived, not hand-tuned per breakpoint: the ink width defines the
 * lens distance, and the vertical placement comes from CAMERA.centerYFraction.
 * The SVG construction lines use the same numbers, so they cannot drift from
 * the 3D letters when the viewport changes.
 */
export function computeFrame(cssWidth: number, cssHeight: number): FrameInfo {
  const width = Math.max(cssWidth, 1)
  const height = Math.max(cssHeight, 1)
  const aspect = width / height
  const fraction =
    width >= 1800
      ? CAMERA.widthFraction.wide
      : width >= 1200
        ? CAMERA.widthFraction.desktop
        : width >= 900
          ? CAMERA.widthFraction.small
          : CAMERA.widthFraction.mobile
  const visibleWidth = FRAMING.inkWidth / fraction
  const visibleHeight = visibleWidth / aspect
  const dist = visibleHeight / (2 * Math.tan(deg(CAMERA.fov) / 2))
  const camY = -(0.5 - CAMERA.centerYFraction) * visibleHeight
  return { cssWidth: width, cssHeight: height, k: height / visibleHeight, dist, camY, visibleHeight }
}

/**
 * Transform for the SVG overlay group so that glyph coordinates (em units,
 * y-up, baseline 0) land exactly on the z=0 plane the camera is facing.
 *
 *   screen = (w/2, h/2) + scale(k, -k) * (glyph + (0, d))
 */
export function overlayTransform(frame: FrameInfo): { k: number; d: number; width: number; height: number } {
  return {
    k: frame.k,
    d: -(FRAMING.wordCenterY + frame.camY),
    width: frame.cssWidth,
    height: frame.cssHeight,
  }
}
