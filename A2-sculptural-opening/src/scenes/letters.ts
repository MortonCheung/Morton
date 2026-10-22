import * as THREE from 'three'
import { contourLoops, type BuiltWord } from '../letters/buildWord'
import { createLetterMaterial, type MaterialMaps } from './materials'
import { ResourceRegistry } from './Resources'

/** The thickness a letter starts with before the volume grows toward the camera. */
export const GROWTH_START = 0.035

export interface ContourLine {
  geometry: THREE.BufferGeometry
  count: number
}

export interface LetterVisual {
  index: number
  char: string
  group: THREE.Group
  mesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshPhysicalMaterial>
  material: THREE.MeshPhysicalMaterial
  lines: ContourLine[]
  /** One material per letter so the construction line fades with its own letter. */
  lineMaterial: THREE.LineBasicMaterial
  depth: number
  basePosition: THREE.Vector3
  baseRotation: THREE.Euler
}

/**
 * Creates the six independent letter objects.
 *
 * - geometry is owned by the word (shared by both O meshes, registered once)
 * - material is per letter (deliberate small variations, one dispose each)
 * - contour lines come from the same font contours as the extrude geometry
 */
export function createLetters(
  word: BuiltWord,
  maps: MaterialMaps,
  registry: ResourceRegistry,
  verticalOffset: number,
): LetterVisual[] {
  return word.letters.map((spec) => {
    const group = new THREE.Group()
    group.name = `letter-group-${spec.char}-${spec.index}`
    group.position.set(spec.offsetX, verticalOffset, 0)

    const material = createLetterMaterial(maps, spec.index)
    registry.addMaterial(material)

    const mesh = new THREE.Mesh(spec.geometry, material)
    mesh.name = `letter-${spec.char}-${spec.index}`
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.scale.z = GROWTH_START
    mesh.position.z = -(word.depth / 2) * (1 - GROWTH_START)
    group.add(mesh)

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xeadfc9,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    })
    lineMaterial.name = `letter-line-material-${spec.index}`
    registry.addMaterial(lineMaterial)

    const lines: ContourLine[] = []
    for (const loop of contourLoops(spec.contours, 44)) {
      const pts = loop.map((p) => new THREE.Vector3(p.x, p.y, word.depth / 2 + 0.004))
      if (pts.length < 2) continue
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      // A line from the same contour source: no SVG/3D mismatch to jump.
      const line = new THREE.Line(geo, lineMaterial)
      line.name = `letter-line-${spec.char}-${spec.index}`
      line.frustumCulled = false
      geo.setDrawRange(0, 0)
      group.add(line)
      registry.addGeometry(geo)
      lines.push({ geometry: geo, count: pts.length })
    }

    return {
      index: spec.index,
      char: spec.char,
      group,
      mesh,
      material,
      lines,
      lineMaterial,
      depth: word.depth,
      basePosition: group.position.clone(),
      baseRotation: group.rotation.clone(),
    }
  })
}
