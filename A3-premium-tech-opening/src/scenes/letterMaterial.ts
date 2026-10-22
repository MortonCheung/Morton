import * as THREE from 'three'

/**
 * Two-surface material split, driven by ExtrudeGeometry's two groups:
 *   group 0 = flat caps  -> satin graphite face
 *   group 1 = chamfer + side walls -> brighter, much finer polished edge
 *
 * That split is what separates "anodised product" from "grey extruded plastic":
 * the face stays quiet, while the machined chamfer carries the crisp highlight.
 */

export const LETTER_FACE_COLOR = new THREE.Color(0x7d8488)
export const LETTER_EDGE_COLOR = new THREE.Color(0xd9e1e4)

export interface LetterMaterials {
  list: THREE.MeshPhysicalMaterial[]
  face: THREE.MeshPhysicalMaterial
  edge: THREE.MeshPhysicalMaterial
  dispose: () => void
}

function createSatinRoughness(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const data = image.data

  // vertical brushing: one value per column, gently smoothed, plus grain
  const columns = 72
  const raw: number[] = []
  for (let i = 0; i < columns; i++) raw.push(0.5 + (Math.random() - 0.5) * 0.09)
  const blurred = raw.map((_, i) => {
    const a = raw[(i - 1 + columns) % columns]
    const b = raw[i]
    const c = raw[(i + 1) % columns]
    return (a + b * 2 + c) / 4
  })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const streak = blurred[Math.floor((x / size) * columns)]
      const value = streak + (Math.random() - 0.5) * 0.015
      const v = Math.max(0, Math.min(255, value * 255))
      const i = (y * size + x) * 4
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/**
 * Broad, low-frequency normal perturbation.
 *
 * A perfectly flat cap reflects exactly one environment texel, so without this
 * the face is dead flat. The waviness makes the face sweep across the studio
 * wall's vertical gradient — satin anodised sheen, not a noisy hammered surface.
 * The slope is computed per UV unit (not per texel) so the amplitude is real.
 */
function createSatinNormal(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(size, size)
  const data = image.data

  const phases = [1.7, 4.1, 2.3]
  const height = (u: number, v: number) =>
    0.6 * Math.sin(2 * Math.PI * (1.3 * u + 0.7 * v) + phases[0]) +
    0.3 * Math.sin(2 * Math.PI * (2.1 * u - 1.4 * v) + phases[1]) +
    0.15 * Math.sin(2 * Math.PI * (3.7 * u + 2.9 * v) + phases[2])

  const amplitude = 0.012
  const at = (x: number, y: number) => height((((x % size) + size) % size) / size, (((y % size) + size) % size) / size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dhdu = ((at(x + 1, y) - at(x - 1, y)) * 0.5 * size) * amplitude
      const dhdv = ((at(x, y + 1) - at(x, y - 1)) * 0.5 * size) * amplitude
      const nx = -dhdu
      const ny = -dhdv
      const inv = 1 / Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(0.72, 0.72)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

export function createLetterMaterials(): LetterMaterials {
  const roughnessMap = createSatinRoughness()
  const normalMap = createSatinNormal()

  const face = new THREE.MeshPhysicalMaterial({
    color: LETTER_FACE_COLOR.clone(),
    metalness: 0.7,
    roughness: 0.38,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(1, 1),
    clearcoat: 0.22,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.65,
    anisotropy: 0.35,
    dithering: true,
    transparent: true,
    opacity: 0,
    depthWrite: true,
    side: THREE.FrontSide,
  })

  const edge = new THREE.MeshPhysicalMaterial({
    color: LETTER_EDGE_COLOR.clone(),
    metalness: 1,
    roughness: 0.1,
    clearcoat: 0.36,
    clearcoatRoughness: 0.08,
    dithering: true,
    envMapIntensity: 1.25,
    transparent: true,
    opacity: 0,
    depthWrite: true,
    side: THREE.FrontSide,
  })

  return {
    list: [face, edge],
    face,
    edge,
    dispose: () => {
      roughnessMap.dispose()
      normalMap.dispose()
      face.dispose()
      edge.dispose()
    },
  }
}
