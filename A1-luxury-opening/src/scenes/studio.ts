import * as THREE from 'three'
import { FRAMING, LIGHTING } from '../data/stageConfig'
import {
  createContactShadowTexture,
  createRadialAlphaTexture,
  createSoftGradientTexture,
  createSoftPanelTexture,
} from './proceduralTextures'

export interface Studio {
  /** floor + light pool, already positioned; add to the scene once */
  floorGroup: THREE.Group
  key: THREE.DirectionalLight
  rim: THREE.DirectionalLight
  fill: THREE.DirectionalLight
  environment: THREE.Texture
  dispose: () => void
}

/**
 * Emissive panel for the environment map. Its feather is what separates a
 * studio softbox from a hard window reflection.
 */
function panel(
  envScene: THREE.Scene,
  color: number,
  intensity: number,
  width: number,
  height: number,
  position: [number, number, number],
  feather: number,
  disposables: Array<{ dispose: () => void }>,
  texture?: THREE.Texture,
) {
  const geometry = new THREE.PlaneGeometry(width, height)
  const map = texture ?? createSoftPanelTexture(192, 192, feather)
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    map,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  mesh.lookAt(0, 0, 0)
  envScene.add(mesh)
  disposables.push(geometry, material, map)
  return mesh
}

/**
 * A photographic studio, not a scene: a dark sweep, shaped sources and a floor
 * with a contact shadow. The shaped sources exist so the satin metal reflects
 * *shapes* — a soft key, a long top strip, a cool rim, a warm floor bounce —
 * instead of a uniform gradient.
 */
export function createStudio(renderer: THREE.WebGLRenderer, shadowMapSize: number): Studio {
  const disposables: Array<{ dispose: () => void }> = []

  // ---- environment (shaped reflections) ----
  const envScene = new THREE.Scene()
  const domeGeometry = new THREE.SphereGeometry(40, 24, 16)
  const domeMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x0e1116).multiplyScalar(0.55),
    side: THREE.BackSide,
    toneMapped: false,
  })
  envScene.add(new THREE.Mesh(domeGeometry, domeMaterial))
  disposables.push(domeGeometry, domeMaterial)

  // The big card behind the lens is what the flat front faces actually reflect;
  // its vertical gradient is the satin sheen you read on the letter faces.
  panel(
    envScene,
    0xfff7ee,
    1.2,
    26,
    15,
    [0, 3.5, 17],
    0.35,
    disposables,
    createSoftGradientTexture(192, 192, 0.8, 0.45, 0.35),
  )
  panel(envScene, 0xfff3e4, 14.0, 6.0, 3.6, [-7, 7, 7], 0.55, disposables) // key softbox
  panel(envScene, 0xf0f3f8, 5.0, 20.0, 2.0, [0, 9.5, 3], 0.7, disposables) // long top strip
  panel(envScene, 0xffe9d2, 5.0, 1.2, 12.0, [-9, 2, 3], 0.5, disposables) // warm left strip
  panel(envScene, 0xe9e7e2, 2.2, 1.2, 12.0, [9, 2, 3], 0.5, disposables) // neutral right strip
  panel(envScene, 0x14161c, 0.8, 20.0, 12.0, [0, 2, -18], 0.6, disposables) // back wall
  panel(envScene, 0xffd9b2, 1.0, 16.0, 9.0, [0, -7, 8], 0.7, disposables) // floor bounce

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTarget = pmrem.fromScene(envScene, 0.045, 0.1, 100)
  pmrem.dispose()

  // ---- lights ----
  const key = new THREE.DirectionalLight(LIGHTING.keyColor, 0)
  key.position.set(-2.2, 9.5, 2.6)
  key.castShadow = true
  key.shadow.mapSize.set(shadowMapSize, shadowMapSize)
  key.shadow.camera.left = -3.8
  key.shadow.camera.right = 3.8
  key.shadow.camera.top = 3.0
  key.shadow.camera.bottom = -3.0
  key.shadow.camera.near = 1
  key.shadow.camera.far = 26
  key.shadow.radius = 14
  key.shadow.blurSamples = 12
  key.shadow.bias = -0.0003
  key.shadow.normalBias = 0.008

  const rim = new THREE.DirectionalLight(LIGHTING.rimColor, 0)
  rim.position.set(5.6, 3.4, -4.2)

  const fill = new THREE.DirectionalLight(LIGHTING.fillColor, 0)
  fill.position.set(4.2, 0.6, 6.2)

  // ---- floor: a soft stage disc, not a plane with a horizon ----
  // The floor is a lit disc whose alpha dissolves into the dark. That removes
  // the hard far edge a big plane produces at this low camera height, and it
  // lets the contact shadow sit in the only lit part of the frame.
  const floorGroup = new THREE.Group()
  floorGroup.name = 'studio-floor'

  const floorGeometry = new THREE.CircleGeometry(8, 96)
  floorGeometry.rotateX(-Math.PI / 2)
  const floorAlpha = createRadialAlphaTexture()
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1410,
    roughness: 0.62,
    metalness: 0.18,
    envMapIntensity: 0.35,
    transparent: true,
    alphaMap: floorAlpha,
    depthWrite: false,
  })
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.position.y = FRAMING.floorY
  floor.receiveShadow = true
  floor.renderOrder = 0
  floorGroup.add(floor)
  disposables.push(floorGeometry, floorMaterial, floorAlpha)

  // Contact shadow: the word's own silhouette, blurred, sitting on the floor.
  // It is what makes the letters read as touching the stage instead of hovering;
  // the VSM shadow from the key light stays for direction.
  const contact = createContactShadowTexture()
  const contactGeometry = new THREE.PlaneGeometry(contact.width, contact.height)
  contactGeometry.rotateX(-Math.PI / 2)
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: contact.texture,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    toneMapped: false,
  })
  const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial)
  contactMesh.position.set(0, FRAMING.floorY + 0.0025, 0)
  contactMesh.renderOrder = 2
  floorGroup.add(contactMesh)
  disposables.push(contactGeometry, contactMaterial, contact.texture)

  return {
    floorGroup,
    key,
    rim,
    fill,
    environment: envTarget.texture,
    dispose: () => {
      for (const item of disposables) item.dispose()
      // disposes the PMREM render target *and* its texture
      envTarget.dispose()
    },
  }
}
