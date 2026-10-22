import * as THREE from 'three'
import { MATERIAL } from '../data/stageConfig'
import { createFaceNormalTexture, createFaceRoughnessTexture } from './proceduralTextures'

export interface LetterMaterialBundle {
  material: THREE.MeshPhysicalMaterial
  roughnessMap: THREE.Texture
  normalMap: THREE.Texture
  dispose: () => void
}

/**
 * Satin metal — one material for the whole wordmark (six draw calls, one
 * material). Reflections are shaped by the studio environment, so the
 * roughness stays in the satin range instead of turning into a mirror.
 */
export function createLetterMaterial(): LetterMaterialBundle {
  const roughnessMap = createFaceRoughnessTexture()
  const normalMap = createFaceNormalTexture()
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MATERIAL.color),
    metalness: MATERIAL.metalness,
    roughness: MATERIAL.roughness,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    envMapIntensity: MATERIAL.envMapIntensity,
    clearcoat: MATERIAL.clearcoat,
    fog: false,
    dithering: true,
    // stays transparent for the whole run: toggling this at the reveal would
    // force a shader recompile mid-animation (measured as an 881ms expand on
    // the mobile tier). depthWrite keeps the letters correctly occluding.
    transparent: true,
    depthWrite: true,
    opacity: 1,
  })
  return {
    material,
    roughnessMap,
    normalMap,
    dispose: () => {
      material.dispose()
      roughnessMap.dispose()
      normalMap.dispose()
    },
  }
}
