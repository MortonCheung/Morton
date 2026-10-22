import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import type { LetterAssets } from '../letters/letterAssets'
import { OPENING } from '../lib/openingConfig'
import { setExtra, setLetters, round4 } from '../lib/timeline'
import { applyCameraPose, computeCameraLayout, type CameraLayout } from './cameraLayout'
import { applyOutlineProjection, type SceneApi, type StageRuntime } from '../features/opening/stage'
import { Studio } from './Studio'
import { createStudioEnvironment } from './studioEnvironment'

interface OpeningCanvasProps {
  stage: StageRuntime
  assets: LetterAssets
  layout: CameraLayout
  isMobile: boolean
  pump: boolean
  onReady: (api: SceneApi | null) => void
}

/** Keeps R3F rendering while the opening is running; off = zero GPU work at hero. */
function RenderPump({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!active) return
    invalidate()
    const tick = () => invalidate()
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [active, invalidate])
  return null
}

function CameraRig({ stage }: { stage: StageRuntime }) {
  const lastSync = useRef(0)
  useFrame((state) => {
    const layout = stage.rig.layout
    const scene = stage.scene
    if (!layout || !scene) return
    const camera = state.camera as THREE.PerspectiveCamera
    const aspect = state.size.width / Math.max(1, state.size.height)
    if (Math.abs(camera.aspect - aspect) > 1e-4) {
      camera.aspect = aspect
      camera.fov = layout.fov
      camera.updateProjectionMatrix()
    }
    applyCameraPose(camera, layout, stage.rig.progress)
    camera.updateMatrixWorld()
    applyOutlineProjection(stage)
    const now = performance.now()
    if (now - lastSync.current > 90) {
      lastSync.current = now
      scene.syncProbe()
    }
  })
  return null
}

function SceneContents({ stage, assets, layout, isMobile, onReady }: Omit<OpeningCanvasProps, 'pump'>) {
  const { camera, gl, invalidate, scene } = useThree()
  const environment = useMemo(() => createStudioEnvironment(), [])
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null)

  useLayoutEffect(() => {
    scene.environment = environment
    invalidate()
    return () => {
      if (scene.environment === environment) scene.environment = null
      environment.dispose()
    }
  }, [environment, invalidate, scene])

  useEffect(() => {
    stage.rig.layout = layout
  }, [layout, stage])

  useLayoutEffect(() => {
    const initial = stage.rig.layout ?? layout
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = initial.fov
    cam.near = 0.1
    cam.far = 120
    cam.aspect = gl.domElement.clientWidth / Math.max(1, gl.domElement.clientHeight)
    cam.updateProjectionMatrix()
    applyCameraPose(cam, initial, stage.rig.progress)
    cam.updateMatrixWorld()
    // Only on mount: a resize must not reset an in-flight reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl])

  const syncProbe = useMemo(() => {
    return () => {
      const meshes = meshesRef.current
      setLetters(
        meshes.map((mesh) => ({
          id: String(mesh.userData.letterId ?? mesh.name),
          position: [round4(mesh.position.x), round4(mesh.position.y), round4(mesh.position.z)],
          rotation: [round4(mesh.rotation.x), round4(mesh.rotation.y), round4(mesh.rotation.z)],
          visible: mesh.visible && (mesh.parent?.visible ?? true),
        })),
      )
      const oMeshes = meshes.filter((m) => m.userData.char === 'O')
      setExtra({
        renderer: {
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures,
          programs: gl.info.programs?.length ?? 0,
          calls: gl.info.render.calls,
          triangles: gl.info.render.triangles,
        },
        dpr: gl.getPixelRatio(),
        twoO: {
          uuids: oMeshes.map((m) => m.geometry.uuid),
          shared: oMeshes.length === 2 && oMeshes[0].geometry === oMeshes[1].geometry,
        },
        viewport: { w: gl.domElement.clientWidth, h: gl.domElement.clientHeight },
      })
    }
  }, [gl])

  useEffect(() => {
    if (!groupRef.current) return
    const api: SceneApi = {
      camera: camera as THREE.PerspectiveCamera,
      gl,
      group: groupRef.current,
      meshes: meshesRef.current,
      material: assets.material,
      keyLight: keyLightRef.current,
      invalidate,
      syncProbe,
      isMobile,
    }
    stage.scene = api
    onReady(api)
    syncProbe()
    applyOutlineProjection(stage)
    return () => {
      if (stage.scene === api) stage.scene = null
      onReady(null)
    }
  }, [assets, camera, gl, invalidate, isMobile, onReady, scene, stage, syncProbe])

  /** Dev/test hook only: proves per-letter independence without touching the UI. */
  useEffect(() => {
    const find = (id: string) => meshesRef.current.find((m) => m.userData.letterId === id)
    window.__MORTON_DEBUG__ = {
      letters: () =>
        meshesRef.current.map((m) => ({
          id: String(m.userData.letterId),
          char: String(m.userData.char),
          geometryUuid: m.geometry.uuid,
          position: [m.position.x, m.position.y, m.position.z],
          rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
          visible: m.visible && (m.parent?.visible ?? true),
          scale: [m.scale.x, m.scale.y, m.scale.z],
        })),
      rotateLetter: (id, rotation) => {
        const mesh = find(id)
        if (!mesh) return false
        mesh.rotation.set(rotation[0], rotation[1], rotation[2])
        invalidate()
        syncProbe()
        return true
      },
      setLetterVisible: (id, visible) => {
        const mesh = find(id)
        if (!mesh) return false
        mesh.visible = visible
        invalidate()
        syncProbe()
        return true
      },
      resetLetters: () => {
        for (const mesh of meshesRef.current) {
          mesh.rotation.set(0, 0, 0)
          mesh.visible = true
        }
        invalidate()
        syncProbe()
      },
      setGroupVisible: (visible) => {
        if (groupRef.current) groupRef.current.visible = visible
        invalidate()
        syncProbe()
      },
      info: () => ({
        state: window.__MORTON__?.state ?? null,
        dpr: gl.getPixelRatio(),
        renderer: { ...gl.info.memory, calls: gl.info.render.calls, triangles: gl.info.render.triangles },
        camera: { position: (camera as THREE.PerspectiveCamera).position.toArray(), fov: (camera as THREE.PerspectiveCamera).fov },
        sceneEnv: Boolean(scene.environment),
        sceneBg: Boolean(scene.background),
        sceneEnvUuid: scene.environment?.uuid ?? null,
        material: {
          color: `#${assets.material.color.getHexString()}`,
          metalness: assets.material.metalness,
          roughness: assets.material.roughness,
          clearcoat: assets.material.clearcoat,
          clearcoatRoughness: assets.material.clearcoatRoughness,
          envMapIntensity: assets.material.envMapIntensity,
          envMap: Boolean(assets.material.envMap),
          opacity: assets.material.opacity,
        },
      }),
    }
    return () => {
      delete window.__MORTON_DEBUG__
    }
  }, [camera, gl, invalidate, scene, syncProbe, assets])

  return (
    <>
      <Studio isMobile={isMobile} onKeyLight={(light) => (keyLightRef.current = light)} />
      <group ref={groupRef} visible={false}>
        {assets.build.letters.map((letter) => (
          <mesh
            key={letter.id}
            ref={(el) => {
              if (el) meshesRef.current[letter.index] = el
            }}
            name={`letter-${letter.id}`}
            userData={{ letterId: letter.id, char: letter.char }}
            geometry={letter.geometry}
            material={assets.material}
            position={[letter.offsetX + letter.centerX, 0, OPENING.startZ]}
            castShadow
            receiveShadow
            dispose={null}
          />
        ))}
      </group>
      <CameraRig stage={stage} />
    </>
  )
}

export function OpeningCanvas({ stage, assets, layout, isMobile, pump, onReady }: OpeningCanvasProps) {
  return (
    <Canvas
      className="stage__canvas"
      frameloop="demand"
      dpr={[1, 2]}
      shadows={!isMobile ? { type: THREE.PCFShadowMap } : false}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.setClearAlpha(0)
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <RenderPump active={pump} />
      <SceneContents
        stage={stage}
        assets={assets}
        layout={layout}
        isMobile={isMobile}
        onReady={onReady}
      />
    </Canvas>
  )
}

/** Re-export so the experience can compute the layout without importing scene internals. */
export { computeCameraLayout }
