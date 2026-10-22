import gsap from 'gsap'
import * as THREE from 'three'
import type { LetterVisual } from '../scenes/letters'
import { GROWTH_START } from '../scenes/letters'
import { LETTER_COLD_START, LETTER_HEAT } from '../scenes/materials'
import type { Studio } from '../scenes/studio'
import { CONTACT_OPACITY } from '../scenes/studio'
import type { CameraRig } from './cameraRig'

const lerp = THREE.MathUtils.lerp

/** Apply the construction state for one letter: thickness, heat, contour progress. */
export function applySolidLetter(letter: LetterVisual, p: number): void {
  const clamped = Math.max(0, Math.min(1, p))
  const s = GROWTH_START + (1 - GROWTH_START) * clamped
  letter.mesh.scale.z = s
  letter.mesh.position.z = -(letter.depth / 2) * (1 - s)
  // A tiny seat as the volume closes: physical, not a spin.
  letter.mesh.position.y = (1 - clamped) * 0.022

  const baseColor = letter.material.userData.baseColor as THREE.Color
  const baseRoughness = (letter.material.userData.baseRoughness as number | undefined) ?? 0.38
  letter.material.color.copy(LETTER_COLD_START).lerp(baseColor, clamped)
  letter.material.emissive.copy(LETTER_HEAT)
  letter.material.emissiveIntensity = 0.18 * (1 - clamped)
  letter.material.roughness = lerp(0.82, baseRoughness, clamped)
  letter.lineMaterial.opacity = 0.95 * Math.max(0, 1 - clamped * 1.35)
}

export function setLineProgress(letter: LetterVisual, p: number): void {
  for (const line of letter.lines) {
    const n = Math.max(0, Math.min(line.count, Math.floor(line.count * p)))
    line.geometry.setDrawRange(0, n)
  }
}

/** Bring every letter to the exact built state (used by reset and reduced motion). */
export function completeLetters(letters: LetterVisual[]): void {
  for (const letter of letters) {
    letter.mesh.visible = true
    applySolidLetter(letter, 1)
    setLineProgress(letter, 1)
    letter.lineMaterial.opacity = 0
    letter.lineMaterial.visible = false
  }
}

/** Rewind the six letters to the beginning of the construction. */
export function resetLetters(letters: LetterVisual[]): void {
  for (const letter of letters) {
    letter.group.position.copy(letter.basePosition)
    letter.group.rotation.copy(letter.baseRotation)
    letter.group.visible = true
    letter.lineMaterial.opacity = 0.95
    letter.lineMaterial.visible = true
    letter.mesh.visible = false
    setLineProgress(letter, 0)
    applySolidLetter(letter, 0)
  }
}

export interface DrawTimelineOptions {
  drawMs: number
  staggerMs: number
  lineDrawMs: number
  solidDrawMs: number
  solidDelayMs: number
  studio: Studio
  onComplete: () => void
}

/**
 * The construction timeline. M→O→R→T→O→N: each letter draws its own silhouette first,
 * then its volume grows from a thin plate into the final extrusion. The total duration is
 * fixed at drawMs (>= 1000) even if all letters finish their tweens earlier.
 */
export function createDrawTimeline(letters: LetterVisual[], opts: DrawTimelineOptions): gsap.core.Timeline {
  resetLetters(letters)
  const s = (ms: number) => ms / 1000
  const tl = gsap.timeline({ onComplete: opts.onComplete })

  let lastEnd = 0
  letters.forEach((letter, index) => {
    const delay = s(index * opts.staggerMs)
    const lineProxy = { p: 0 }
    tl.to(
      lineProxy,
      {
        p: 1,
        duration: s(opts.lineDrawMs),
        ease: 'power1.inOut',
        onUpdate: () => setLineProgress(letter, lineProxy.p),
      },
      delay,
    )

    const solidProxy = { p: 0 }
    const solidStart = delay + s(opts.solidDelayMs)
    tl.to(
      solidProxy,
      {
        p: 1,
        duration: s(opts.solidDrawMs),
        ease: 'power2.out',
        onStart: () => {
          letter.mesh.visible = true
        },
        onUpdate: () => applySolidLetter(letter, solidProxy.p),
      },
      solidStart,
    )
    lastEnd = Math.max(lastEnd, solidStart + s(opts.solidDrawMs))
  })

  // Contact shadow creeps in as the objects become solid.
  const primaryProxy = { v: 0 }
  const secondaryProxy = { v: 0 }
  tl.to(primaryProxy, { v: CONTACT_OPACITY.primary * 0.32, duration: 0.45, ease: 'power1.out', onUpdate: () => { opts.studio.contactPrimary.material.opacity = primaryProxy.v } }, Math.max(0, lastEnd - 0.45))
  tl.to(secondaryProxy, { v: CONTACT_OPACITY.secondary * 0.4, duration: 0.45, ease: 'power1.out', onUpdate: () => { opts.studio.contactSecondary.material.opacity = secondaryProxy.v } }, Math.max(0, lastEnd - 0.45))

  const total = s(opts.drawMs)
  const end = Math.max(lastEnd, total)
  if (end - lastEnd > 0.001) {
    // A real tail keeps the drawing state >= 1000 ms even if all letter tweens are short.
    tl.to({ tail: 0 }, { tail: 1, duration: end - lastEnd, ease: 'none' }, lastEnd)
  }

  tl.eventCallback('onComplete', () => {
    for (const letter of letters) {
      letter.lineMaterial.opacity = 0
      letter.lineMaterial.visible = false
    }
    opts.onComplete()
  })

  return tl
}

export interface ExpandFrom {
  azimuth: number
  radius: number
  targetY: number
}

export interface ExpandTo {
  azimuth: number
  radius: number
  targetY: number
}

/**
 * The ~500 ms expansion: a small camera move reveals the side thickness while the contact
 * shadow completes. Letter geometry is already final, so there is no position jump.
 */
export function createExpandTimeline(
  rig: CameraRig,
  studio: Studio,
  from: ExpandFrom,
  to: ExpandTo,
  durationMs: number,
  onComplete: () => void,
): gsap.core.Timeline {
  rig.azimuth = from.azimuth
  rig.radius = from.radius
  rig.targetY = from.targetY

  const tl = gsap.timeline({ onComplete })
  tl.to(
    rig,
    {
      azimuth: to.azimuth,
      radius: to.radius,
      targetY: to.targetY,
      duration: durationMs / 1000,
      ease: 'power2.inOut',
    },
    0,
  )
  tl.to(studio.contactPrimary.material, { opacity: CONTACT_OPACITY.primary, duration: (durationMs / 1000) * 0.9, ease: 'power2.out' }, 0)
  tl.to(studio.contactSecondary.material, { opacity: CONTACT_OPACITY.secondary, duration: (durationMs / 1000) * 0.9, ease: 'power2.out' }, 0)
  return tl
}
