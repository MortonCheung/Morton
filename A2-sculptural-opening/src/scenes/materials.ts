import * as THREE from 'three'

export interface MaterialMaps {
  mineral: THREE.Texture
}

/** Base mineral / matte-metal coating. The roughness map breaks up the specular response. */
export const LETTER_LOOK = {
  color: '#34383b',
  metalness: 0.22,
  // roughnessMap multiplies this value; ~0.9 gives an effective 0.37–0.53 mineral tooth.
  roughness: 0.92,
  clearcoat: 0.16,
  clearcoatRoughness: 0.38,
  envMapIntensity: 0.9,
  bumpScale: 0.005,
} as const

/** Colour the letters start from while the volume is still thin. */
export const LETTER_COLD_START = new THREE.Color('#303335')
/** Cast-heat tint emitted at the growing front; decays to zero as the solid closes. */
export const LETTER_HEAT = new THREE.Color('#8a6a4a')

/**
 * One material per letter (the four meshes do not share a material), each with a tiny
 * material variation so the six letters read as a cast series rather than cloned type.
 * The maps are shared textures owned by the scene registry.
 */
export function createLetterMaterial(maps: MaterialMaps, index: number): THREE.MeshPhysicalMaterial {
  const tint = ((index % 3) - 1) * 0.014
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(LETTER_LOOK.color).offsetHSL(0, 0, tint),
    metalness: LETTER_LOOK.metalness,
    roughness: LETTER_LOOK.roughness + (index % 2 === 0 ? -0.025 : 0.025),
    clearcoat: LETTER_LOOK.clearcoat,
    clearcoatRoughness: LETTER_LOOK.clearcoatRoughness,
    envMapIntensity: LETTER_LOOK.envMapIntensity,
    roughnessMap: maps.mineral,
    bumpMap: maps.mineral,
    bumpScale: LETTER_LOOK.bumpScale,
    emissive: LETTER_HEAT.clone(),
    emissiveIntensity: 0,
    flatShading: false,
  })
  material.name = `morton-letter-material-${index}`
  material.userData.baseColor = material.color.clone()
  material.userData.baseRoughness = material.roughness
  return material
}

/** Called only if the mineral texture genuinely failed: plain coating, never a stuck page. */
export function dropTextureMaps(material: THREE.MeshPhysicalMaterial, fallbackRoughness = 0.38): void {
  material.roughnessMap = null
  material.bumpMap = null
  material.roughness = fallbackRoughness
  material.needsUpdate = true
}
