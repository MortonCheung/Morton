import gsap from 'gsap'
import type { SceneControls } from '../../scenes/OpeningScene'

/**
 * built -> hero in ~500ms.
 *
 * The camera and orientation stay locked during the crossfade: the outline is a
 * flat orthographic projection of the same contour and must not drift while the
 * solid fades in. What changes instead is material state — opacity, roughness
 * sharpening, clearcoat lift, and a small environment-rotation sweep that drags
 * the softbox highlight across the bevels. Then the hero drift starts with the
 * outline already gone.
 */
export const EXPAND_DURATION = 0.5

export function createExpandTimeline(controls: SceneControls, svg: SVGSVGElement | null) {
  const tl = gsap.timeline({ paused: true })

  tl.to(controls, { reveal: 1, duration: 0.42, ease: 'power2.out' }, 0)
  tl.to(controls, { env: 1, duration: EXPAND_DURATION, ease: 'power2.out' }, 0)
  tl.to(controls, { envYaw: 0.16, duration: 0.55, ease: 'power2.inOut' }, 0)
  if (svg) tl.to(svg, { opacity: 0, duration: 0.34, ease: 'power2.in' }, 0.14)

  return tl
}
