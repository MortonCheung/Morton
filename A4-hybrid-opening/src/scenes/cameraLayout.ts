import type { PerspectiveCamera } from 'three'

/**
 * Camera layout maths. Kept out of React and out of the scene graph so the
 * same numbers can be unit-asserted and reused by the docs.
 *
 * The lens is deliberately long (24 deg) so a 3/4 reveal shows volume without
 * the wide-angle distortion that would cheapen a wordmark.
 */
export const CAMERA_FOV = 24

export interface Pose {
  x: number
  y: number
  z: number
}

export interface CameraLayout {
  fov: number
  fill: number
  distance: number
  visibleWidth: number
  visibleHeight: number
  targetY: number
  draw: Pose
  hero: Pose
  /** World Z of the word's front face while the outline is on screen. */
  outlinePlaneZ: number
}

/** Apply the interpolated draw->hero pose to a camera. No allocation. */
export function applyCameraPose(
  camera: PerspectiveCamera,
  layout: CameraLayout,
  progress: number,
): void {
  const p = Math.min(1, Math.max(0, progress))
  camera.position.set(
    layout.draw.x + (layout.hero.x - layout.draw.x) * p,
    layout.draw.y + (layout.hero.y - layout.draw.y) * p,
    layout.draw.z + (layout.hero.z - layout.draw.z) * p,
  )
  camera.lookAt(0, layout.targetY, 0)
}

export function computeCameraLayout(
  viewportWidth: number,
  viewportHeight: number,
  wordWidth: number,
  startZ: number,
  depth: number,
): CameraLayout {
  const width = Math.max(320, viewportWidth)
  const height = Math.max(320, viewportHeight)
  const aspect = width / height
  const fill = width < 640 ? 0.86 : width < 1100 ? 0.74 : 0.72
  const visibleWidth = wordWidth / fill
  const visibleHeight = visibleWidth / aspect
  const halfFov = (CAMERA_FOV * Math.PI) / 360
  const distance = visibleWidth / (2 * Math.tan(halfFov) * aspect)
  // Word centre sits at ~47% of viewport height: slightly above optical centre.
  const targetY = -0.03 * visibleHeight
  return {
    fov: CAMERA_FOV,
    fill,
    distance,
    visibleWidth,
    visibleHeight,
    targetY,
    draw: { x: 0, y: targetY, z: distance * 1.012 },
    hero: {
      x: distance * (width < 640 ? 0.16 : 0.18),
      y: targetY + (width < 640 ? 0.28 : 0.38),
      z: distance * 0.968,
    },
    outlinePlaneZ: startZ + depth / 2,
  }
}
