import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { PLINTH } from '../data/config'
import { ResourceRegistry } from './Resources'

export interface Studio {
  sweep: THREE.Mesh
  keyLight: THREE.SpotLight
  floorLight: THREE.SpotLight
  floorFill: THREE.SpotLight
  rimLight: THREE.SpotLight
  washLight: THREE.SpotLight
  fillLight: THREE.DirectionalLight
  hemiLight: THREE.HemisphereLight
  contactPrimary: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  contactSecondary: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  environment: THREE.Texture
}

export const CONTACT_OPACITY = { primary: 0.9, secondary: 0.46 } as const

/**
 * A long, low display base: 0.1 units tall, 1.05 deep. It is a slab, not a trophy
 * plinth — it gives the letters a lit top surface to stand on and a crisp dark edge
 * under them, which is what makes the group feel installed rather than floating.
 */
export function createPlinth(width: number, registry: ResourceRegistry): THREE.Mesh {
  // A 12 mm edge radius catches a soft highlight and stops the slab reading as a shelf.
  const geo = new RoundedBoxGeometry(width + PLINTH.marginX * 2, PLINTH.height, PLINTH.depth, 3, 0.012)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0e1012,
    roughness: 0.65,
    metalness: 0.08,
    envMapIntensity: 0.35,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'display-base'
  mesh.position.set(0, PLINTH.height / 2, 0.02)
  mesh.castShadow = true
  mesh.receiveShadow = true
  registry.addGeometry(geo)
  registry.addMaterial(mat)
  return mesh
}

/**
 * Seamless studio sweep: a flat floor easing into a vertical wall.
 * Built as one extruded profile strip, normals facing into the room.
 *
 * It uses MeshLambertMaterial deliberately: a PBR floor produces a strong grazing-angle
 * Fresnel line where the cove becomes tangent to the low camera, which reads as a shelf
 * edge. A diffuse sweep dissolves into the wall instead of drawing a bright line.
 */
function createSweepGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number]> = []
  profile.push([12, 0])
  profile.push([-8, 0])
  const radius = 4
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2)
    profile.push([-8 - radius * Math.sin(t), radius - radius * Math.cos(t)])
  }
  profile.push([-12, 9])

  const halfWidth = 18
  const positions: number[] = []
  const uvs: number[] = []
  for (let i = 0; i < profile.length; i++) {
    const [z, y] = profile[i]
    const v = (i / (profile.length - 1)) * 7
    positions.push(-halfWidth, y, z, halfWidth, y, z)
    uvs.push(0, v, 6, v)
  }
  const indices: number[] = []
  for (let i = 0; i < profile.length - 1; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, b, c, b, d, c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function softbox(
  scene: THREE.Scene,
  width: number,
  height: number,
  color: number,
  intensity: number,
  position: [number, number, number],
  lookAt: [number, number, number],
): void {
  const geo = new THREE.PlaneGeometry(width, height)
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
  mat.color.multiplyScalar(intensity)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(...position)
  mesh.lookAt(...lookAt)
  scene.add(mesh)
}

/**
 * A tiny procedural "photographic studio" environment: three emissive softboxes around a
 * black room. Far cheaper than an HDRI and it gives the clearcoat/metal highlight shapes.
 */
function createEnvironment(renderer: THREE.WebGLRenderer, registry: ResourceRegistry): THREE.Texture {
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x050505)
  softbox(envScene, 7, 3.4, 0xf3f2ee, 1.8, [-5, 5.2, 2.4], [0, 0.4, 0])
  softbox(envScene, 1.4, 5.5, 0xc3cfd9, 0.7, [5.2, 2.6, 1.6], [0, 0.4, 0])
  softbox(envScene, 5.2, 1.1, 0xf5f4f0, 0.6, [0, 6, -0.6], [0, 0.4, 0])
  softbox(envScene, 3.2, 2.2, 0x8a8f93, 0.3, [0, 2.1, -6], [0, 2, 0])

  const pmrem = new THREE.PMREMGenerator(renderer)
  const target = pmrem.fromScene(envScene, 0.02)
  pmrem.dispose()
  // RenderTarget owns its texture; dispose it once (adding the texture separately
  // would double-dispose the same GPU allocation).
  registry.addOther(target)

  envScene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry.dispose()
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) m.dispose()
    }
  })
  return target.texture
}

function createContactShadow(
  texture: THREE.Texture,
  width: number,
  height: number,
  opacity: number,
  y: number,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const geo = new THREE.PlaneGeometry(width, height)
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, y, 0)
  mesh.renderOrder = 2
  mesh.name = 'contact-shadow'
  return mesh
}

/**
 * Builds the lit exhibition space. All objects registered here are owned by the scene
 * registry and disposed by the SceneController, never by individual meshes.
 */
export function createStudio(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  registry: ResourceRegistry,
  opts: { shadowMapSize: number; contactTexture: THREE.Texture },
): Studio {
  const sweepGeo = createSweepGeometry()
  const sweepMat = new THREE.MeshLambertMaterial({
    color: 0x1d2023,
    emissive: 0x040608,
  })
  const sweep = new THREE.Mesh(sweepGeo, sweepMat)
  sweep.receiveShadow = true
  sweep.name = 'studio-sweep'
  scene.add(sweep)
  registry.addGeometry(sweepGeo)
  registry.addMaterial(sweepMat)

  const environment = createEnvironment(renderer, registry)
  scene.environment = environment
  scene.environmentIntensity = 0.24

  // Key: a warm-neutral spot from high front-left, the only shadow caster. Its falloff
  // across the six letters creates the light-to-shade gradient that makes them one group.
  const keyLight = new THREE.SpotLight(0xf7f3ec, 240, 0, 0.38, 0.82, 1.45)
  keyLight.position.set(-4.6, 4.2, 2.8)
  keyLight.target.position.set(-0.2, 0.34, 0)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize)
  keyLight.shadow.camera.near = 1
  keyLight.shadow.camera.far = 22
  keyLight.shadow.bias = -0.0003
  keyLight.shadow.normalBias = 0.02
  keyLight.shadow.radius = 3
  scene.add(keyLight, keyLight.target)

  // Soft pool on the base/floor; no shadow, just a lit exhibition surface.
  const floorLight = new THREE.SpotLight(0xe9eaeb, 110, 0, 0.62, 1.0, 1.45)
  floorLight.position.set(0.4, 6.2, 2.6)
  floorLight.target.position.set(0, 0, -1.5)
  scene.add(floorLight, floorLight.target)

  // Foreground bounce: the low camera compresses the floor into a thin strip, so a broad
  // low light in front of the mark keeps the near floor readable as a surface (no shadows).
  const floorFill = new THREE.SpotLight(0xe6e3dc, 80, 0, 1.2, 1.0, 1.35)
  floorFill.position.set(0, 3.5, 9.0)
  floorFill.target.position.set(0, 0, 4.2)
  scene.add(floorFill, floorFill.target)

  // Cool rim from behind: separates the dark mineral from the wall without a cyber glow.
  const rimLight = new THREE.SpotLight(0xb7cbdc, 100, 0, 0.24, 0.95, 1.4)
  rimLight.position.set(2.8, 3.0, -4.2)
  rimLight.target.position.set(0, 0.55, 0)
  scene.add(rimLight, rimLight.target)

  // Wide wash on the cyclorama behind the mark: the wall is lit, not a void.
  const washLight = new THREE.SpotLight(0xf3e7d6, 420, 0, 0.45, 1.0, 1.3)
  washLight.position.set(0.2, 3.6, 0.6)
  washLight.target.position.set(0, 0.9, -12)
  scene.add(washLight, washLight.target)

  const fillLight = new THREE.DirectionalLight(0xaebdca, 0.16)
  fillLight.position.set(3.6, 2.0, 4.2)
  scene.add(fillLight)

  const hemiLight = new THREE.HemisphereLight(0x333b44, 0x080706, 0.1)
  scene.add(hemiLight)

  const contactPrimary = createContactShadow(opts.contactTexture, 5.8, 1.45, CONTACT_OPACITY.primary, 0.005)
  const contactSecondary = createContactShadow(opts.contactTexture, 9.2, 2.9, CONTACT_OPACITY.secondary, 0.004)
  scene.add(contactPrimary, contactSecondary)
  registry.addGeometry(contactPrimary.geometry, contactSecondary.geometry)
  registry.addMaterial(contactPrimary.material, contactSecondary.material)

  scene.fog = new THREE.FogExp2(0x0d0e0f, 0.024)

  return {
    sweep,
    keyLight,
    floorLight,
    floorFill,
    rimLight,
    washLight,
    fillLight,
    hemiLight,
    contactPrimary,
    contactSecondary,
    environment,
  }
}
