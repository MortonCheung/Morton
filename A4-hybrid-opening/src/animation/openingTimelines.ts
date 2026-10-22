import gsap from 'gsap'
import * as THREE from 'three'
import type { LetterAssets } from '../letters/letterAssets'
import { LIGHT, MATERIAL, OPENING } from '../lib/openingConfig'
import { applyOutlineProjection, type OutlineTarget, type StageRuntime } from '../features/opening/stage'

/**
 * M -> O -> R -> T -> O -> N, 320 ms each, 172 ms stagger.
 * Timeline length is 1180 ms by construction (>= the 1000 ms gate).
 */
export function buildDrawTimeline(outline: OutlineTarget, onComplete: () => void): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete })
  tl.set(outline.root, { opacity: 1 }, 0)
  outline.letterGroups.forEach((group, index) => {
    const paths = Array.from(group.querySelectorAll<SVGPathElement>('path'))
    for (const path of paths) {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
    }
    tl.to(
      paths,
      {
        strokeDashoffset: 0,
        duration: OPENING.letterDrawMs / 1000,
        ease: 'power2.inOut',
        stagger: 0.02,
      },
      (index * OPENING.letterStaggerMs) / 1000,
    )
  })
  return tl
}

/**
 * ~500 ms: the outline dissolves while the same contours gain depth, material
 * and a light glint; the camera eases from frontal to a shallow 3/4.
 */
export function buildExpandTimeline(
  stage: StageRuntime,
  assets: LetterAssets,
  onComplete: () => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete })
  const scene = stage.scene
  const outline = stage.outline
  const meshes = scene?.meshes ?? []
  const group = scene?.group
  const material = assets.material
  const { endColor } = assets
  const sec = OPENING.expandMs / 1000

  if (group) tl.set(group, { visible: true }, 0)
  material.opacity = 0
  if (outline) tl.to(outline.root, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
  tl.to(material, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
  tl.to(
    material.color,
    { r: endColor.r, g: endColor.g, b: endColor.b, duration: 0.46, ease: 'power2.out' },
    0,
  )
  tl.to(
    material,
    {
      roughness: MATERIAL.roughness,
      clearcoat: MATERIAL.clearcoat,
      envMapIntensity: MATERIAL.envMapIntensity,
      duration: 0.46,
      ease: 'power2.out',
    },
    0,
  )
  meshes.forEach((mesh, index) => {
    tl.to(mesh.position, { z: 0, duration: 0.42, ease: 'power3.out' }, index * 0.01)
  })
  if (scene) tl.to(scene.keyLight, { intensity: LIGHT.keyHero, duration: sec, ease: 'power2.inOut' }, 0)
  tl.to(stage.rig, { progress: 1, duration: sec, ease: 'power2.inOut' }, 0)
  return tl
}

/** Snap every animated value to the hero end state (reduced motion + safety net). */
export function applyHeroState(stage: StageRuntime, assets: LetterAssets, endColor: THREE.Color): void {
  const scene = stage.scene
  assets.material.color.copy(endColor)
  assets.material.roughness = MATERIAL.roughness
  assets.material.clearcoat = MATERIAL.clearcoat
  assets.material.envMapIntensity = MATERIAL.envMapIntensity
  assets.material.opacity = 1
  if (scene) {
    scene.group.visible = true
    for (const mesh of scene.meshes) {
      mesh.position.z = 0
      mesh.visible = true
    }
    if (scene.keyLight) scene.keyLight.intensity = LIGHT.keyHero
    scene.invalidate()
  }
  if (stage.outline) gsap.set(stage.outline.root, { opacity: 0 })
  stage.rig.progress = 1
}

/** Put the stage back to frame zero without touching any GPU resource. */
export function resetStage(stage: StageRuntime, assets: LetterAssets): void {
  const { material, startColor } = assets
  material.opacity = 0
  material.color.copy(startColor)
  material.roughness = MATERIAL.startRoughness
  material.clearcoat = MATERIAL.startClearcoat
  material.envMapIntensity = MATERIAL.startEnvMapIntensity
  const scene = stage.scene
  if (scene) {
    scene.group.visible = false
    for (const mesh of scene.meshes) {
      mesh.position.z = OPENING.startZ
      mesh.rotation.set(0, 0, 0)
      mesh.visible = true
    }
    if (scene.keyLight) scene.keyLight.intensity = LIGHT.keyBase
    scene.invalidate()
  }
  stage.rig.progress = 0
  applyOutlineProjection(stage)
  const outline = stage.outline
  if (outline) {
    gsap.set(outline.root, { opacity: 0 })
    for (const paths of outline.paths) {
      for (const path of paths) {
        const length = path.getTotalLength()
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
      }
    }
  }
}
