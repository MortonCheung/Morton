import * as THREE from 'three'
import type { WordBuild } from '../letters/buildWord'
import { MATERIAL } from '../lib/openingConfig'

/**
 * Every GPU resource owned by the opening, in one place, with one disposal
 * path. Geometry is shared between the two O meshes, so per-mesh disposal is
 * explicitly disabled in the scene (`dispose={null}`) and this owner is the
 * only thing that frees it.
 */
export interface LetterAssets {
  build: WordBuild
  material: THREE.MeshPhysicalMaterial
  startColor: THREE.Color
  endColor: THREE.Color
  dispose(): void
}

export function createLetterAssets(build: WordBuild): LetterAssets {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MATERIAL.startColor),
    metalness: MATERIAL.metalness,
    roughness: MATERIAL.startRoughness,
    clearcoat: MATERIAL.startClearcoat,
    clearcoatRoughness: MATERIAL.clearcoatRoughness,
    envMapIntensity: MATERIAL.startEnvMapIntensity,
    ior: MATERIAL.ior,
    transparent: true,
    opacity: 0,
  })
  material.name = 'morton-champagne'

  const startColor = new THREE.Color(MATERIAL.startColor)
  const endColor = new THREE.Color(MATERIAL.color)
  let disposed = false

  return {
    build,
    material,
    startColor,
    endColor,
    dispose() {
      if (disposed) return
      disposed = true
      for (const geometry of build.geometries.values()) geometry.dispose()
      build.geometries.clear()
      material.dispose()
    },
  }
}

/** Reset the shared surface for a replay (no allocation, no recompile). */
export function resetSurface(material: THREE.MeshPhysicalMaterial, startColor: THREE.Color) {
  material.color.copy(startColor)
  material.roughness = MATERIAL.startRoughness
  material.clearcoat = MATERIAL.startClearcoat
  material.envMapIntensity = MATERIAL.startEnvMapIntensity
  material.opacity = 0
}

/** Snap the surface to its final hero values (used by reduced-motion). */
export function finalizeSurface(material: THREE.MeshPhysicalMaterial, endColor: THREE.Color) {
  material.color.copy(endColor)
  material.roughness = MATERIAL.roughness
  material.clearcoat = MATERIAL.clearcoat
  material.envMapIntensity = MATERIAL.envMapIntensity
  material.opacity = 1
}
