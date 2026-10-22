import * as THREE from 'three'

/**
 * Purpose-built studio environment, baked once into a PMREM cube.
 *
 * The wordmark is a set of flat faces plus narrow chamfers, so what the camera
 * actually sees is:
 *  - the flat face: reflects the "wall behind the camera" (a vertical gradient
 *    built from strips, so the face has a top-to-bottom satin falloff);
 *  - the chamfer: reflects the hard light sources (top softbox + narrow strips),
 *    which is what produces the thin, clean highlight lines.
 *
 * No downloaded HDRI: cheap, controlled, and it keeps the neutral graphite
 * palette instead of drifting into blue/purple tech lighting.
 */

interface Panel {
  w: number
  h: number
  position: [number, number, number]
  rotation: [number, number, number]
  color: number
  intensity: number
}

const WALL = [2.2, 1.15, 0.55, 0.3, 0.16, 0.08]

function buildPanels(): Panel[] {
  const panels: Panel[] = []

  // vertical gradient wall behind the camera — the satin gradient in the faces
  WALL.forEach((intensity, index) => {
    panels.push({
      w: 18,
      h: 1.75,
      position: [0, 4.6 - index * 1.72, 7],
      rotation: [0, 0, 0],
      color: 0xd9e3e8,
      intensity,
    })
  })

  // broad overhead softbox — fills the top chamfers
  panels.push({ w: 18, h: 7, position: [0, 6.9, 0.5], rotation: [Math.PI / 2, 0, 0], color: 0xffffff, intensity: 3.1 })

  // narrow cool strip, camera left — the crisp vertical highlight
  panels.push({ w: 0.4, h: 7.2, position: [-4.7, 0.8, 1.6], rotation: [0, Math.PI / 2, 0], color: 0xe6f3fb, intensity: 5.2 })

  // narrow warm strip, camera right — separation without a second highlight
  panels.push({ w: 0.62, h: 6.2, position: [4.9, 0.1, -1.4], rotation: [0, -Math.PI / 2, 0], color: 0xffe9d2, intensity: 2.1 })

  // thin overhead kicker — reflects straight down onto the top chamfers, which
  // is what makes the machined edge read as a crisp line rather than an outline
  panels.push({ w: 11, h: 0.12, position: [0, 3.8, 1.6], rotation: [0, 0, 0], color: 0xffffff, intensity: 9.5 })
  panels.push({ w: 7, h: 0.08, position: [0, 3.25, 2.9], rotation: [0, 0, 0], color: 0xffffff, intensity: 2.2 })

  // faint floor bounce
  panels.push({ w: 18, h: 18, position: [0, -5.8, 0], rotation: [-Math.PI / 2, 0, 0], color: 0x2c3237, intensity: 0.55 })

  // broad side fills so yawed side walls read as graphite, never pure black
  panels.push({ w: 12, h: 8, position: [-6.2, 0.4, 0], rotation: [0, Math.PI / 2, 0], color: 0x8f9aa2, intensity: 0.42 })
  panels.push({ w: 12, h: 8, position: [6.2, 0.2, 0], rotation: [0, -Math.PI / 2, 0], color: 0x9a9184, intensity: 0.26 })

  return panels
}

export interface StudioEnvironment {
  texture: THREE.Texture
  dispose: () => void
}

export function createStudioEnvironment(renderer: THREE.WebGLRenderer, resolution = 128): StudioEnvironment {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x040506)

  const disposables: Array<{ dispose: () => void }> = []
  for (const panel of buildPanels()) {
    const geometry = new THREE.PlaneGeometry(panel.w, panel.h)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(panel.color).multiplyScalar(panel.intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...panel.position)
    mesh.rotation.set(...panel.rotation)
    envScene.add(mesh)
    disposables.push(geometry, material)
  }

  const target = pmrem.fromScene(envScene, 0.02, 0.1, 40, { size: resolution })
  const texture = target.texture
  for (const item of disposables) item.dispose()
  pmrem.dispose()

  return {
    texture,
    dispose: () => texture.dispose(),
  }
}
