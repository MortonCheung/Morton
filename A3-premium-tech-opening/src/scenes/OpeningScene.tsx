import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import type { WordBuild } from '../letters/buildWord'
import type { LayoutFrame } from '../lib/frame'
import { setLetters, type ProbeLetter } from '../lib/timeline'
import { createLetterMaterials } from './letterMaterial'
import { createStudioEnvironment } from './studioEnvironment'

export interface SceneControls {
  reveal: number
  env: number
  envYaw: number
  hero: number
  heroT: number
  yaw: number
  pitch: number
  pointerX: number
  pointerY: number
}

export interface SceneApi {
  controls: SceneControls
  reset: () => void
  enterHero: () => void
  /** reduced-motion path: fully lit, no drift, no timelines */
  showStatic: () => void
  snapshot: () => ProbeLetter[]
  setLetter: (index: number, patch: { rotationY?: number; positionX?: number; visible?: boolean }) => void
  resetLetters: () => void
  rendererInfo: () => Record<string, unknown>
}

export interface ScenePointer {
  tx: number
  ty: number
}

interface SceneProps {
  build: WordBuild
  frame: LayoutFrame
  pointer: ScenePointer
  onReady: () => void
}

const createControls = (): SceneControls => ({
  reveal: 0,
  env: 0.5,
  envYaw: 0,
  hero: 0,
  heroT: 0,
  yaw: 0,
  pitch: 0,
  pointerX: 0,
  pointerY: 0,
})

const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t)

// RectAreaLight needs its LTC lookup tables registered once.
RectAreaLightUniformsLib.init()

/**
 * Studio softboxes as real area lights: unlike a directional light, the
 * incidence angle changes across the face, which is what gives the extrusion a
 * soft top-to-bottom sheen instead of one flat fill value.
 */
function Softbox(props: {
  position: [number, number, number]
  width: number
  height: number
  intensity: number
  color: string
}) {
  const ref = useRef<THREE.RectAreaLight>(null)
  useLayoutEffect(() => {
    ref.current?.lookAt(0, 0, 0)
  })
  return <rectAreaLight ref={ref} {...props} />
}

/** Keep the orthographic frustum locked to the same numbers the SVG layer uses. */
function CameraRig({ frame }: { frame: LayoutFrame }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    cam.left = -frame.camW / 2
    cam.right = frame.camW / 2
    cam.top = frame.camH / 2
    cam.bottom = -frame.camH / 2
    cam.near = 0.1
    cam.far = 60
    cam.position.set(0, frame.camY, 12)
    cam.updateProjectionMatrix()
  }, [camera, frame])
  return null
}

const SceneContent = forwardRef<SceneApi, SceneProps>(function SceneContent({ build, frame, pointer, onReady }, ref) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<Array<THREE.Mesh | null>>([])
  const baseX = useRef<number[]>([])
  const controls = useRef<SceneControls>(createControls()).current
  const readyRef = useRef(false)
  const gpuRef = useRef<string>('unknown')
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const materials = useMemo(() => createLetterMaterials(), [])
  const materialList = materials.list
  useEffect(() => () => materials.dispose(), [materials])

  baseX.current = build.letters.map((letter) => letter.x)

  useEffect(() => {
    try {
      const context = gl.getContext()
      const info = context.getExtension('WEBGL_debug_renderer_info')
      gpuRef.current = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown'
    } catch {
      gpuRef.current = 'unknown'
    }
  }, [gl])

  useEffect(() => {
    // The bake is a synchronous main-thread job. Let the drawing timeline paint
    // its first frames first, then do it at 64px (soft studio reflections do not
    // need more) so the drawing hitches by a few frames instead of hundreds of ms.
    let cancelled = false
    const handle = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return
        const environment = createStudioEnvironment(gl, 64)
        scene.environment = environment.texture
        scene.environmentIntensity = 1
        gl.compile(scene, camera)
        cleanup = () => {
          scene.environment = null
          environment.dispose()
        }
      })
    })
    let cleanup: (() => void) | null = null
    return () => {
      cancelled = true
      cancelAnimationFrame(handle)
      cleanup?.()
    }
  }, [gl, scene, camera, frame.tier])

  useEffect(() => {
    let a = 0
    let b = 0
    a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => {
        if (readyRef.current) return
        readyRef.current = true
        onReadyRef.current()
      })
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [])

  const snapshot = (): ProbeLetter[] =>
    build.letters.map((letter, index) => {
      const mesh = meshRefs.current[index]
      if (!mesh) {
        return { id: letter.id, position: [letter.x, letter.y, 0], rotation: [0, 0, 0], visible: false }
      }
      return {
        id: letter.id,
        position: [mesh.position.x, mesh.position.y, mesh.position.z],
        rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
        visible: mesh.visible,
      }
    })

  useImperativeHandle(
    ref,
    (): SceneApi => ({
      controls,
      reset: () => {
        Object.assign(controls, createControls())
        for (const material of materialList) {
          material.transparent = true
          material.needsUpdate = true
          material.opacity = 0
        }
        materials.face.roughness = 0.5
        materials.face.clearcoat = 0.08
        materials.face.envMapIntensity = 0.35
        materials.edge.envMapIntensity = 0.6
        const group = groupRef.current
        if (group) {
          group.rotation.set(0, 0, 0)
          group.visible = false
        }
        build.letters.forEach((letter, index) => {
          const mesh = meshRefs.current[index]
          if (!mesh) return
          mesh.position.set(letter.x, letter.y, 0)
          mesh.rotation.set(0, 0, 0)
          mesh.visible = true
        })
        setLetters(snapshot())
      },
      enterHero: () => {
        controls.hero = 1
        controls.heroT = 0
        for (const material of materialList) {
          material.transparent = false
          material.needsUpdate = true
          material.opacity = 1
        }
      },
      showStatic: () => {
        controls.reveal = 1
        controls.env = 1
        controls.envYaw = 0.12
        controls.hero = 0
        controls.heroT = 0
        controls.yaw = 0
        controls.pitch = 0
        for (const material of materialList) {
          material.transparent = false
          material.needsUpdate = true
          material.opacity = 1
        }
        materials.face.roughness = 0.5
        materials.face.clearcoat = 0.16
        materials.edge.envMapIntensity = 1.25
        const group = groupRef.current
        if (group) {
          group.rotation.set(0, 0, 0)
          group.visible = true
        }
        setLetters(snapshot())
      },
      snapshot,
      setLetter: (index, patch) => {
        const mesh = meshRefs.current[index]
        if (!mesh) return
        if (patch.rotationY !== undefined) mesh.rotation.y = patch.rotationY
        if (patch.positionX !== undefined) mesh.position.x = baseX.current[index] + patch.positionX
        if (patch.visible !== undefined) mesh.visible = patch.visible
        setLetters(snapshot())
      },
      resetLetters: () => {
        build.letters.forEach((letter, index) => {
          const mesh = meshRefs.current[index]
          if (!mesh) return
          mesh.position.set(letter.x, letter.y, 0)
          mesh.rotation.set(0, 0, 0)
          mesh.visible = true
        })
        setLetters(snapshot())
      },
      rendererInfo: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        points: gl.info.render.points,
        lines: gl.info.render.lines,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        gpu: gpuRef.current,
        pixelSize: `${gl.domElement.width}x${gl.domElement.height}`,
      }),
    }),
    [build, controls, gl, materials, materialList],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    controls.pointerX += (pointer.tx - controls.pointerX) * 0.055
    controls.pointerY += (pointer.ty - controls.pointerY) * 0.055

    if (controls.hero) {
      controls.heroT = Math.min(controls.heroT + dt, 8)
      const k = easeOut(Math.min(1, controls.heroT / 2.6))
      controls.yaw = 0.2 * k + Math.sin(state.clock.elapsedTime * 0.23) * 0.004 * k
      controls.pitch = -0.008 * k
    }

    const group = groupRef.current
    if (group) {
      group.rotation.y = controls.yaw + controls.pointerX * 0.018
      group.rotation.x = controls.pitch + controls.pointerY * 0.009
      group.visible = controls.reveal > 0.002
    }

    const reveal = Math.min(1, controls.reveal)
    materials.face.opacity = reveal
    materials.edge.opacity = reveal
    materials.face.roughness = 0.50 - 0.08 * reveal
    materials.face.clearcoat = 0.08 + 0.08 * reveal
    materials.face.envMapIntensity = 0.35 + 0.45 * controls.env
    materials.edge.envMapIntensity = 0.5 + 0.75 * controls.env
    scene.environmentRotation.y = controls.envYaw + controls.yaw * 0.4
  })

  return (
    <>
      <ambientLight intensity={0.02} />
      <Softbox position={[-1.3, 2.15, 4.4]} width={5.4} height={2.0} intensity={14} color="#fff4e8" />
      <Softbox position={[0.3, -1.9, 4.6]} width={5.6} height={1.3} intensity={2.2} color="#e9f0f5" />
      <Softbox position={[0.6, 0, 5.8]} width={7} height={4.2} intensity={1} color="#dbe4ea" />
      <Softbox position={[-4.0, 0.2, 2.6]} width={0.8} height={5.4} intensity={7} color="#e4f1f9" />
      <Softbox position={[4.6, 0.8, -0.4]} width={1.1} height={4.4} intensity={4.2} color="#ffe8d0" />
      <directionalLight position={[0, 4, -6]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-5, 1, 4]} intensity={1.1} color="#eef6fb" />
      <group ref={groupRef} visible={false} name="morton-word">
        {build.letters.map((letter, index) => (
          <mesh
            key={letter.id}
            ref={(node) => {
              meshRefs.current[index] = node
            }}
            name={`letter-${letter.id}`}
            geometry={build.glyphs.get(letter.glyphKey)}
            material={materialList}
            position={[letter.x, letter.y, 0]}
            dispose={null}
            castShadow={false}
            receiveShadow={false}
          />
        ))}
      </group>
    </>
  )
})

export interface OpeningSceneProps extends Omit<SceneProps, 'onReady'> {
  visible: boolean
  onReady: () => void
}

export const OpeningScene = forwardRef<SceneApi, OpeningSceneProps>(function OpeningScene(
  { build, frame, pointer, visible, onReady },
  ref,
) {
  return (
    <Canvas
      className="opening-canvas"
      orthographic
      dpr={frame.dpr}
      frameloop={visible ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ position: [0, 0, 12], near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.setClearAlpha(0)
      }}
    >
      <CameraRig frame={frame} />
      <SceneContent ref={ref} build={build} frame={frame} pointer={pointer} onReady={onReady} />
    </Canvas>
  )
})
