import type { LetterId } from '../data/chapters'
import { clamp, lerp, window01 } from '../lib/dom'

/**
 * Pure choreography model: chapter index + scroll progress -> per-letter pose.
 *
 * No three.js and no DOM here on purpose — the same numbers can be reviewed,
 * unit-tested or replayed without a renderer. Word units are the font's em
 * units (cap height ~0.7, word width ~4.8).
 */
export interface LetterPose {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  scale: number
  /** 0 = ghosted into the paper, 1 = full ink. */
  tone: number
}

export interface StagePose {
  letters: Record<LetterId, LetterPose>
  camera: { x: number; y: number; z: number }
}

export interface PoseMetrics {
  width: number
  capHeight: number
  baseX: Record<LetterId, number>
}

/** Shared with the renderer; used to project DOM anchors into letter space. */
export const STAGE_FOV = 38

export interface AnchorContext {
  aspect: number
  /** Root group scale (word units -> rendered units). */
  fit: number
  /** Measured horizontal centre of each chapter's DOM anchor, 0..1. */
  ratios: Partial<Record<number, number | null>>
}

type ActivePose = { fx: number; fy: number; z: number; scale: number; rx?: number; ry?: number; rz?: number }

type Visual =
  | { kind: 'hero' }
  | { kind: 'wordmark'; y: number; scale: number; z: number; tone: number; compress: number; cameraZ: number }
  | {
      kind: 'active'
      active: LetterId
      pose: ActivePose
      ghost: { scale: number; z: number; tone: number; spread: number }
      camera: { x: number; y: number; z: number }
    }

const HERO_CAMERA = { x: 0, y: 0, z: 7 }

const VISUALS: Visual[] = [
  // M — ME
  {
    kind: 'active',
    active: 'M',
    pose: { fx: -0.56, fy: 0.02, z: 0.9, scale: 1.6, ry: 0.16, rz: -0.035 },
    ghost: { scale: 0.58, z: -2.4, tone: 0.06, spread: 0.12 },
    camera: { x: -0.18, y: 0, z: 6.55 },
  },
  // O — ORIGIN
  {
    kind: 'active',
    active: 'O1',
    pose: { fx: -0.87, fy: 0, z: 0.7, scale: 1.52, ry: -0.14 },
    ghost: { scale: 0.56, z: -2.6, tone: 0.055, spread: 0.1 },
    camera: { x: -0.2, y: 0, z: 6.7 },
  },
  // R — RECORD
  {
    kind: 'active',
    active: 'R',
    pose: { fx: -0.54, fy: 0.02, z: 0.8, scale: 1.5, ry: 0.2, rz: 0.02 },
    ghost: { scale: 0.56, z: -2.5, tone: 0.05, spread: 0.1 },
    camera: { x: -0.16, y: 0, z: 6.6 },
  },
  // T — THINGS I BUILD
  {
    kind: 'active',
    active: 'T',
    pose: { fx: -0.7, fy: 0.03, z: 0.85, scale: 1.55 },
    ghost: { scale: 0.55, z: -2.5, tone: 0.05, spread: 0.1 },
    camera: { x: -0.12, y: 0, z: 6.5 },
  },
  // O — OUTPUT (whole word recedes to a signature line under the gallery)
  { kind: 'wordmark', y: -3.6, scale: 0.22, z: -2.2, tone: 0.05, compress: 0.72, cameraZ: 7.3 },
  // N — NEXT
  {
    kind: 'active',
    active: 'N',
    pose: { fx: 0.42, fy: 0, z: 0.8, scale: 1.5, ry: -0.16 },
    ghost: { scale: 0.58, z: -2.4, tone: 0.055, spread: 0.1 },
    camera: { x: 0.12, y: 0, z: 6.6 },
  },
]

const ZERO: LetterPose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, tone: 1 }
const clone = (p: LetterPose): LetterPose => ({ ...p })

function activeX(visual: Extract<Visual, { kind: 'active' }>, metrics: PoseMetrics, narrow: boolean): number {
  return (narrow ? 0 : visual.pose.fx) * (metrics.width / 2)
}

function poseFor(
  visual: Visual,
  metrics: PoseMetrics,
  narrow: boolean,
  anchor?: number | null,
  ctx?: AnchorContext,
): Record<LetterId, LetterPose> {
  const ids = Object.keys(metrics.baseX) as LetterId[]
  const out = {} as Record<LetterId, LetterPose>

  if (visual.kind === 'hero') {
    for (const id of ids) out[id] = { ...ZERO, x: metrics.baseX[id] }
    return out
  }

  if (visual.kind === 'wordmark') {
    for (const id of ids) {
      out[id] = {
        ...ZERO,
        x: metrics.baseX[id] * visual.compress,
        y: narrow ? visual.y + 0.18 : visual.y,
        z: visual.z,
        scale: narrow ? visual.scale * 0.86 : visual.scale,
        tone: visual.tone,
      }
    }
    return out
  }

  let focusX = activeX(visual, metrics, narrow)
  if (anchor != null && ctx && !narrow) {
    // Project the measured DOM anchor through the active chapter camera so the
    // letter sits exactly beside its content on every viewport.
    const distance = visual.camera.z - visual.pose.z
    const halfWidth = Math.tan((STAGE_FOV * Math.PI) / 360) * distance * ctx.aspect
    const worldX = (anchor - 0.5) * 2 * halfWidth + visual.camera.x
    focusX = worldX / ctx.fit
  }
  const scaleBoost = narrow ? 2 : 1
  for (const id of ids) {
    if (id === visual.active) {
      out[id] = {
        ...ZERO,
        x: focusX,
        y: (narrow ? 0.6 : visual.pose.fy) * metrics.capHeight,
        z: visual.pose.z,
        rx: visual.pose.rx ?? 0,
        ry: visual.pose.ry ?? 0,
        rz: visual.pose.rz ?? 0,
        scale: visual.pose.scale * scaleBoost,
        // On phones the active letter sits behind copy, so it is a mid-tone
        // watermark rather than full ink.
        tone: narrow ? 0.5 : 1,
      }
    } else {
      const base = metrics.baseX[id]
      out[id] = {
        ...ZERO,
        x: narrow ? base * 0.55 : base + (base - metrics.baseX[visual.active]) * visual.ghost.spread,
        y: narrow ? -0.5 : 0,
        z: visual.ghost.z,
        scale: narrow ? visual.ghost.scale * 0.62 : visual.ghost.scale,
        tone: visual.ghost.tone,
      }
    }
  }
  return out
}

function cameraFor(visual: Visual, narrow: boolean): { x: number; y: number; z: number } {
  if (visual.kind === 'hero') return { ...HERO_CAMERA }
  if (visual.kind === 'wordmark') return { x: 0, y: narrow ? 0.25 : 0.1, z: visual.cameraZ }
  return narrow ? { x: 0, y: 0, z: visual.camera.z } : visual.camera
}

function lerpPose(a: LetterPose, b: LetterPose, t: number): LetterPose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    scale: lerp(a.scale, b.scale, t),
    tone: lerp(a.tone, b.tone, t),
  }
}

/** Intro window: hold the previous pose, morph, then hold the chapter pose. */
const MORPH_FROM = 0.07
const MORPH_TO = 0.58

/** T chapter: the letter turns as each of the three steps takes over. */
const T_SPINS = [-0.32, 0.46, -0.14]
const T_SCALE = [1.5, 1.62, 1.5]

/** N chapter: at the end everything returns to the opening line-up. */
const FINALE_FROM = 0.68
const FINALE_TO = 0.96

export function resolvePose(
  chapterIndex: number,
  progress: number,
  metrics: PoseMetrics,
  narrow: boolean,
  ctx?: AnchorContext,
): StagePose {
  const p = clamp(progress)
  const visual = VISUALS[chapterIndex] ?? VISUALS[0]
  const previous = chapterIndex === 0 ? ({ kind: 'hero' } as Visual) : VISUALS[chapterIndex - 1]

  // OUTPUT (index 4) clears the letters out fast so the gallery is clean for
  // the whole reading window instead of fading through it.
  const t = chapterIndex === 4 ? window01(p, 0, 0.14) : window01(p, MORPH_FROM, MORPH_TO)
  const anchor = ctx?.ratios[chapterIndex] ?? null
  const prevAnchor = ctx?.ratios[chapterIndex - 1] ?? null
  const from = poseFor(previous, metrics, narrow, prevAnchor, ctx)
  const to = poseFor(visual, metrics, narrow, anchor, ctx)
  const letters = {} as Record<LetterId, LetterPose>
  for (const id of Object.keys(from) as LetterId[]) letters[id] = lerpPose(from[id], to[id], t)

  const camera = cameraFor(visual, narrow)
  const prevCam = cameraFor(previous, narrow)
  camera.x = lerp(prevCam.x, camera.x, t)
  camera.y = lerp(prevCam.y, camera.y, t)
  camera.z = lerp(prevCam.z, camera.z, t)

  if (chapterIndex === 3) {
    const stepF = clamp((p - 0.1) / 0.74) * (T_SPINS.length - 1)
    const i0 = Math.min(T_SPINS.length - 2, Math.floor(stepF))
    const local = stepF - i0
    const spin = lerp(T_SPINS[i0], T_SPINS[i0 + 1], local)
    const scale = lerp(T_SCALE[i0], T_SCALE[i0 + 1], local)
    const tPose = letters.T
    tPose.ry += spin * t
    if (tPose.scale > 1) tPose.scale = lerp(tPose.scale, scale * (narrow ? 2.3 : 1), Math.min(1, t * 1.2))
    tPose.z += Math.sin(local * Math.PI) * 0.12 * t
  }

  if (chapterIndex === 4) {
    // Signature line drifts a little against the tracks.
    for (const id of Object.keys(letters) as LetterId[]) letters[id].x -= 0.35 * p * t
  }

  if (chapterIndex === VISUALS.length - 1) {
    const hero = poseFor({ kind: 'hero' }, metrics, narrow)
    const t2 = window01(p, FINALE_FROM, FINALE_TO)
    for (const id of Object.keys(letters) as LetterId[]) letters[id] = lerpPose(letters[id], hero[id], t2)
    camera.x = lerp(camera.x, HERO_CAMERA.x, t2)
    camera.y = lerp(camera.y, HERO_CAMERA.y, t2)
    camera.z = lerp(camera.z, HERO_CAMERA.z, t2)
  }

  return { letters, camera }
}

export function heroPose(metrics: PoseMetrics, narrow = false): StagePose {
  return { letters: poseFor({ kind: 'hero' }, metrics, narrow), camera: { ...HERO_CAMERA } }
}

export function emptyMetrics(): PoseMetrics {
  return {
    width: 4.8,
    capHeight: 0.7,
    baseX: { M: -2.0, O1: -1.0, R: -0.15, T: 0.55, O2: 1.3, N: 2.0 },
  }
}

export const letterPoseClone = clone
