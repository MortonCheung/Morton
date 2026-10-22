import gsap from 'gsap'
import { CAMERA_DEG, LIGHTING, TIMING } from '../data/stageConfig'
import type { OpeningScene } from '../scenes/OpeningScene'

export interface RevealOptions {
  scene: OpeningScene
  outlineInk: SVGGElement | null
  progressEl: HTMLElement | null
  onComplete: () => void
}

/**
 * Construction lines → solid object, ~560 ms.
 *
 * Four things happen together so the change reads as one physical event rather
 * than a cross-fade: the outline dissolves, the letters grow forward from the
 * same plane, the studio comes up, and the lens pushes in. The material is
 * opacity-faded only during this beat (then returned to opaque so the hero
 * frame has no transparent sorting cost).
 */
export function createRevealTimeline({ scene, outlineInk, progressEl, onComplete }: RevealOptions): gsap.core.Timeline {
  scene.beginReveal()

  const timeline = gsap.timeline({ onComplete })
  const reveal = scene.motion

  if (outlineInk) timeline.to(outlineInk, { opacity: 0, duration: 0.34, ease: 'power2.inOut' }, 0)
  if (progressEl) timeline.to(progressEl, { scaleX: 1, opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)

  timeline.to(scene.letterMaterial, { opacity: 1, duration: 0.42, ease: 'power2.out' }, 0)
  timeline.to(reveal, { environment: LIGHTING.environmentIntensity, duration: 0.42, ease: 'power2.out' }, 0)
  timeline.to(reveal, { key: 1, duration: 0.5, ease: 'power2.out' }, 0.02)
  timeline.to(reveal, { rim: 1, duration: 0.5, ease: 'power2.out' }, 0.02)
  timeline.to(reveal, { fill: 1, duration: 0.5, ease: 'power2.out' }, 0.02)
  timeline.to(reveal, { dolly: 1, duration: TIMING.expand, ease: 'power2.inOut' }, 0)

  reveal.reveal.forEach((slot, index) => {
    timeline.to(
      slot,
      {
        v: 1,
        duration: TIMING.expandLetter,
        ease: 'power2.out',
      },
      0.02 + index * TIMING.expandLetterStagger,
    )
  })

  // hold the timeline open to exactly TIMING.expand even if child tweens finish sooner
  timeline.to({}, { duration: 0 }, TIMING.expand)
  timeline.call(() => scene.endReveal(), [], TIMING.expand - 0.001)

  return timeline
}

/** Slow lateral arc after the hero settles; reveals the extruded walls. */
export function createHeroDrift(scene: OpeningScene): gsap.core.Timeline {
  return gsap.timeline().to(scene.motion, {
    orbitYaw: CAMERA_DEG.heroYaw,
    orbitElev: CAMERA_DEG.heroElevation,
    duration: TIMING.heroDrift,
    ease: 'power2.inOut',
  })
}
