import * as THREE from 'three'
import { OUTLINE } from '../data/outline.generated'

/**
 * Small procedural textures. Generated on the client (a few ms, no network) so
 * the first paint never waits on an image, and so the "surface" is part of the
 * object rather than a downloaded asset.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tileable smooth value noise in [0,1]. */
function valueNoise(size: number, cells: number, rand: () => number): Float32Array {
  const grid = new Float32Array(cells * cells)
  for (let i = 0; i < grid.length; i++) grid[i] = rand()
  const out = new Float32Array(size * size)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells
    const y0 = Math.floor(gy) % cells
    const y1 = (y0 + 1) % cells
    const fy = smooth(gy - Math.floor(gy))
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells
      const x0 = Math.floor(gx) % cells
      const x1 = (x0 + 1) % cells
      const fx = smooth(gx - Math.floor(gx))
      const a = grid[y0 * cells + x0]
      const b = grid[y0 * cells + x1]
      const c = grid[y1 * cells + x0]
      const d = grid[y1 * cells + x1]
      const top = a + (b - a) * fx
      const bottom = c + (d - c) * fx
      out[y * size + x] = top + (bottom - top) * fy
    }
  }
  return out
}

/**
 * Grey-scale roughness variation for the satin metal. Subtle by intent: this is
 * polish variation on a machined surface, not a noise texture you should notice.
 */
export function createFaceRoughnessTexture(size = 256): THREE.DataTexture {
  const rand = mulberry32(0x4d4f5254)
  // one value per column: vertical brushing, no 2D blotches
  const column = new Float32Array(size)
  for (let x = 0; x < size; x++) column[x] = rand() - 0.5
  const data = new Uint8Array(size * size * 4)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1)
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1)
      // continuous left→right sweep (0.82 … 1.0 of the material roughness)
      const sweep = 0.82 + smooth(u) * 0.18
      const brush = column[x] * 0.018 * (0.55 + 0.45 * (1 - v))
      const g = Math.min(1, Math.max(0, sweep + brush))
      const i = (y * size + x) * 4
      const c = Math.round(g * 255)
      data[i] = c
      data[i + 1] = c
      data[i + 2] = c
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = 4
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * Smooth per-letter normal sweep. This is the fix for the flat front face: a
 * planar extruded cap reflects one environment direction, so it reads as one
 * tone. A *continuous* left→right tilt (not noise) sweeps the reflection across
 * the studio's shaped sources, producing 3+ readable brightness bands on the
 * cap while the silhouette stays untouched.
 */
export function createFaceNormalTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < size; y++) {
    const v = y / (size - 1)
    const ny = (0.5 - v) * 0.34
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1)
      const nx = (smooth(u) - 0.5) * 0.95
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = Math.round((nx / len * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((ny / len * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = 4
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

/** Soft radial alpha for the floor disc: the stage dissolves instead of ending. */
export function createRadialAlphaTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5)
  // alphaMap reads the green channel, so the gradient has to live in RGB
  g.addColorStop(0, 'rgb(255,255,255)')
  g.addColorStop(0.34, 'rgb(206,206,206)')
  g.addColorStop(0.62, 'rgb(52,52,52)')
  g.addColorStop(0.82, 'rgb(0,0,0)')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  return texture
}

/** Warm light pool on the studio floor. One soft shape, no lens flares. */
export function createLightPoolTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.scale(1, 0.58)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5)
  g.addColorStop(0, 'rgba(255, 232, 198, 0.55)')
  g.addColorStop(0.35, 'rgba(255, 226, 186, 0.22)')
  g.addColorStop(0.68, 'rgba(255, 220, 176, 0.06)')
  g.addColorStop(1, 'rgba(255, 220, 176, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * Soft-edged emissive panel for the environment map. Hard-edged planes read as
 * windows in the metal; feathered panels read as studio lights.
 */
export function createSoftPanelTexture(width = 256, height = 256, feather = 0.45): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(width, height)
  const smooth = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    return c * c * (3 - 2 * c)
  }
  for (let y = 0; y < height; y++) {
    const ny = y / (height - 1)
    const edgeY = smooth(Math.min(ny, 1 - ny) / Math.max(feather * 0.5, 0.001))
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1)
      const edgeX = smooth(Math.min(nx, 1 - nx) / Math.max(feather * 0.5, 0.001))
      const v = Math.round(Math.pow(edgeX * edgeY, 0.85) * 255)
      const i = (y * width + x) * 4
      image.data[i] = v
      image.data[i + 1] = v
      image.data[i + 2] = v
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}


/**
 * Very low-amplitude normal map. A perfectly flat extruded face reflects one
 * constant environment direction and reads like CG plastic; a hand-finished
 * cast face has faint undulations that catch different parts of the studio.
 * Amplitude is deliberately tiny (a few degrees).
 */
export function createSurfaceNormalTexture(size = 256, strength = 1.4): THREE.DataTexture {
  const rand = mulberry32(0x53555246)
  const broad = valueNoise(size, 4, rand)
  const fine = valueNoise(size, 14, rand)
  const height = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) height[i] = broad[i] * 0.72 + fine[i] * 0.28

  const data = new Uint8Array(size * size * 4)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * size + x) * 4
      data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  texture.anisotropy = 4
  texture.colorSpace = THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

/** Vertical gradient with feathered sides — the big card behind the lens. */
export function createSoftGradientTexture(
  width = 192,
  height = 192,
  top = 1,
  bottom = 0.12,
  feather = 0.3,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(width, height)
  const smooth = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    return c * c * (3 - 2 * c)
  }
  for (let y = 0; y < height; y++) {
    const ny = y / (height - 1)
    const vertical = bottom + (top - bottom) * (1 - ny)
    const sideEdge = Math.pow(smooth(Math.min(ny, 1 - ny) / feather), 0.4)
    for (let x = 0; x < width; x++) {
      const nx = x / (width - 1)
      const edge = smooth(Math.min(nx, 1 - nx) / feather)
      const v = Math.round(Math.min(1, vertical * sideEdge * edge) * 255)
      const i = (y * width + x) * 4
      image.data[i] = v
      image.data[i + 1] = v
      image.data[i + 2] = v
      image.data[i + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}


/**
 * Word-shaped contact shadow. Built from the same outline paths as the letters
 * (so it hugs their base instead of being a generic circle), then blurred.
 * Cheap: one transparent plane, no extra shadow map.
 */
export function createContactShadowTexture(): {
  texture: THREE.CanvasTexture
  width: number
  height: number
} {
  const inkW = OUTLINE.ink.maxX - OUTLINE.ink.minX
  const inkH = OUTLINE.ink.maxY - OUTLINE.ink.minY
  const planeW = inkW * 1.1
  const planeH = inkH * 2.4
  const W = 1024
  const H = Math.round((W * planeH) / planeW)
  const scale = W / planeW

  const sharp = document.createElement('canvas')
  sharp.width = W
  sharp.height = H
  const ctx = sharp.getContext('2d')!
  ctx.setTransform(scale, 0, 0, -scale, W / 2, H / 2)
  ctx.translate(0, -OUTLINE.centerY)
  ctx.fillStyle = '#000000'
  for (const letter of OUTLINE.letters) {
    ctx.save()
    ctx.translate(letter.offsetX, 0)
    for (const contour of letter.contours) ctx.fill(new Path2D(contour.d))
    ctx.restore()
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const out = canvas.getContext('2d')!
  out.filter = `blur(${Math.round(W * 0.022)}px)`
  out.globalAlpha = 0.9
  out.drawImage(sharp, 0, 0)
  out.filter = `blur(${Math.round(W * 0.006)}px)`
  out.globalAlpha = 0.55
  out.drawImage(sharp, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, width: planeW, height: planeH }
}
