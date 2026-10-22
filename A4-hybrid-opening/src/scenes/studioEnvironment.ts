import * as THREE from 'three'

/**
 * Hand-painted equirectangular studio environment (generated, no download).
 *
 * The flat letter faces reflect a very narrow longitude band (u ~ 0.69-0.77).
 * A soft horizontal gradient is painted exactly across that band so the
 * reflection sweeps from letter to letter; two narrow strips add the crisp
 * specular edges that make the surface read as finished metal. Sides sample
 * the dark half and stay in shadow.
 */
export function createStudioEnvironment(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  if (ctx) {
    const base = ctx.createLinearGradient(0, 0, 0, h)
    base.addColorStop(0, '#070606')
    base.addColorStop(0.32, '#100e0b')
    base.addColorStop(0.5, '#16130f')
    base.addColorStop(0.7, '#0b0a08')
    base.addColorStop(1, '#050404')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)

    // Dim rear fill so extruded sides keep a readable value.
    const rear = ctx.createLinearGradient(0, 0, w, 0)
    rear.addColorStop(0, 'rgba(88, 78, 64, 0.1)')
    rear.addColorStop(0.5, 'rgba(52, 47, 40, 0.04)')
    rear.addColorStop(1, 'rgba(88, 78, 64, 0.1)')
    ctx.fillStyle = rear
    ctx.fillRect(0, 0, w, h)

    // The flat faces reflect u ~= 0.75-0.785 (measured with a banded probe env).
    // A soft horizontal sweep placed exactly there gives the word its gradient.
    const sweep = ctx.createLinearGradient(w * 0.727, 0, w * 0.8, 0)
    sweep.addColorStop(0, 'rgba(6, 6, 6, 0.95)')
    sweep.addColorStop(0.42, 'rgba(200, 178, 146, 0.4)')
    sweep.addColorStop(0.72, 'rgba(255, 236, 210, 0.8)')
    sweep.addColorStop(1, 'rgba(255, 248, 235, 1)')
    ctx.fillStyle = sweep
    ctx.fillRect(w * 0.727, h * 0.3, w * 0.073, h * 0.4)

    // Vertical soft edges for the sweep.
    const mask = ctx.createLinearGradient(0, h * 0.24, 0, h * 0.76)
    mask.addColorStop(0, 'rgba(6, 6, 6, 1)')
    mask.addColorStop(0.14, 'rgba(6, 6, 6, 0)')
    mask.addColorStop(0.86, 'rgba(6, 6, 6, 0)')
    mask.addColorStop(1, 'rgba(6, 6, 6, 1)')
    ctx.fillStyle = mask
    ctx.fillRect(w * 0.727, h * 0.3, w * 0.073, h * 0.4)

    // Crisp specular strips inside the sampled band.
    const strip = (u: number, width: number, color: string, alpha: number) => {
      const g = ctx.createLinearGradient(0, h * 0.26, 0, h * 0.74)
      g.addColorStop(0, `rgba(${color}, 0)`)
      g.addColorStop(0.15, `rgba(${color}, ${alpha})`)
      g.addColorStop(0.82, `rgba(${color}, ${alpha})`)
      g.addColorStop(1, `rgba(${color}, 0)`)
      ctx.fillStyle = g
      ctx.fillRect(w * u, h * 0.26, w * width, h * 0.48)
    }
    strip(0.7485, 0.005, '255, 251, 243', 1)
    strip(0.7605, 0.0035, '255, 241, 220', 0.75)
    strip(0.7795, 0.007, '216, 231, 248', 0.95)

    // High softbox for the top bevels (normals tilt up -> lower v).
    const top = ctx.createLinearGradient(0, h * 0.13, 0, h * 0.33)
    top.addColorStop(0, 'rgba(255, 246, 230, 0)')
    top.addColorStop(0.45, 'rgba(255, 246, 230, 0.85)')
    top.addColorStop(1, 'rgba(255, 246, 230, 0)')
    ctx.fillStyle = top
    ctx.fillRect(w * 0.69, h * 0.13, w * 0.15, h * 0.2)

    // Low floor bounce for the under-bevels.
    const bounce = ctx.createLinearGradient(0, h * 0.66, 0, h * 0.82)
    bounce.addColorStop(0, 'rgba(196, 168, 128, 0)')
    bounce.addColorStop(0.5, 'rgba(196, 168, 128, 0.3)')
    bounce.addColorStop(1, 'rgba(196, 168, 128, 0)')
    ctx.fillStyle = bounce
    ctx.fillRect(w * 0.69, h * 0.66, w * 0.16, h * 0.16)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.name = 'morton-studio-env'
  return texture
}
