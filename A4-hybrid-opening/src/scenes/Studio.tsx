import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ContactShadows } from '@react-three/drei'
import { LIGHT, PALETTE } from '../lib/openingConfig'

interface StudioProps {
  isMobile: boolean
  onKeyLight: (light: THREE.DirectionalLight) => void
}

/** Generated floor light pool (no downloaded texture). */
function useFloorGlow(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      g.addColorStop(0, 'rgba(198, 180, 152, 0.34)')
      g.addColorStop(0.4, 'rgba(146, 126, 100, 0.12)')
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.name = 'floor-glow'
    return tex
  }, [])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

/**
 * Lights + floor. The reflective environment is owned by the scene
 * (see studioEnvironment.ts) because it must be set on scene.environment.
 */
export function Studio({ isMobile, onKeyLight }: StudioProps) {
  const keyRef = useRef<THREE.DirectionalLight>(null)
  const glow = useFloorGlow()

  useEffect(() => {
    if (keyRef.current) onKeyLight(keyRef.current)
  }, [onKeyLight])

  return (
    <>
      <ambientLight intensity={0.03} color={PALETTE.ambient} />
      <directionalLight
        ref={keyRef}
        position={[-2.4, 4.6, 3.2]}
        intensity={1.3}
        color={PALETTE.key}
        castShadow={!isMobile}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-radius={3.5}
      >
        <orthographicCamera attach="shadow-camera" args={[-4.2, 4.2, 3.2, -3.2, 1, 16]} />
      </directionalLight>
      <directionalLight position={[4.4, 1.2, -1.6]} intensity={0.7} color={PALETTE.rim} />
      <directionalLight position={[0.4, -0.8, 4.2]} intensity={0.15} color={PALETTE.fill} />

      {/* Floor: additive light pool + blurred contact shadow, cheap and static. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.599, 0]} renderOrder={0}>
        <planeGeometry args={[24, 14]} />
        <meshBasicMaterial
          map={glow}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* Directional cast shadow: a readable offset direction on the floor. */}
      {!isMobile ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.601, 0]} receiveShadow renderOrder={1}>
          <planeGeometry args={[18, 10]} />
          <shadowMaterial transparent opacity={0.14} depthWrite={false} />
        </mesh>
      ) : null}
      {/* Tight contact shadow: the letter/floor junction. */}
      {!isMobile ? (
        <ContactShadows
          position={[0, -0.598, 0]}
          scale={10}
          resolution={512}
          far={1.3}
          blur={3.2}
          opacity={0.4}
          color="#000000"
          frames={Infinity}
        />
      ) : null}
    </>
  )
}
