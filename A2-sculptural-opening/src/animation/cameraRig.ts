import * as THREE from 'three'

/** Slight upward gaze: the camera sits just below the mark's optical centre. */
export const CAMERA_ELEVATION = THREE.MathUtils.degToRad(-1.2)
export const CAMERA_FOV = 28

export interface RigValues {
  azimuth: number
  radius: number
  targetX: number
  targetY: number
  targetZ: number
}

/**
 * Spherical camera rig. GSAP tweens the public numbers; the render loop applies them.
 * `apply` reuses no temporary objects and allocates nothing per frame.
 */
export class CameraRig implements RigValues {
  azimuth = THREE.MathUtils.degToRad(8)
  radius = 9
  targetX = 0.12
  targetY = 0.33
  targetZ = 0

  apply(camera: THREE.PerspectiveCamera, azimuthOffset = 0): void {
    const az = this.azimuth + azimuthOffset
    const ce = Math.cos(CAMERA_ELEVATION)
    const se = Math.sin(CAMERA_ELEVATION)
    camera.position.set(
      this.targetX + this.radius * ce * Math.sin(az),
      this.targetY + this.radius * se,
      this.targetZ + this.radius * ce * Math.cos(az),
    )
    camera.lookAt(this.targetX, this.targetY, this.targetZ)
  }
}

/**
 * Distance at which a `width`-wide object fills `widthFraction` of the viewport width
 * (and does not exceed `heightFraction` of its height).
 */
export function fitRadius(
  width: number,
  height: number,
  aspect: number,
  widthFraction: number,
  heightFraction = 0.62,
  fovDeg = CAMERA_FOV,
): number {
  const tan = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2)
  const byWidth = width / Math.max(0.05, widthFraction * 2 * tan * Math.max(0.2, aspect))
  const byHeight = height / Math.max(0.05, heightFraction * 2 * tan)
  return Math.max(byWidth, byHeight)
}

/** Responsive width occupancy: never touching the side edges, never shrinking to a speck. */
export function widthFractionFor(viewportWidth: number): number {
  if (viewportWidth <= 760) return 0.9
  if (viewportWidth <= 1100) return 0.8
  return 0.75
}
