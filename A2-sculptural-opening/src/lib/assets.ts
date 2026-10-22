import * as THREE from 'three'
import { CONTACT_SHADOW_URL, MINERAL_TEXTURE_URL } from '../data/config'

export interface AssetStatus {
  mineral: boolean
  contact: boolean
  timedOut: boolean
  fallback: boolean
}

export interface TextureBundle {
  /** grayscale tooth, used as roughness + bump on the letters (linear data) */
  mineral: THREE.Texture
  contact: THREE.Texture
}

export interface CriticalAssets {
  /**
   * Texture objects exist synchronously, so materials can reference them before the
   * images arrive (no shader recompile mid-opening). `ready` resolves only when both
   * images have actually loaded, failed, or timed out.
   */
  textures: TextureBundle
  ready: Promise<AssetStatus>
}

const LOAD_TIMEOUT_MS = 10_000

interface PendingTexture {
  texture: THREE.Texture
  done: Promise<{ ok: boolean; timedOut: boolean }>
}

function loadTracked(
  loader: THREE.TextureLoader,
  url: string,
  anisotropy: number,
  colorSpace: THREE.ColorSpace,
): PendingTexture {
  let resolveDone: (value: { ok: boolean; timedOut: boolean }) => void = () => {}
  const done = new Promise<{ ok: boolean; timedOut: boolean }>((resolve) => {
    resolveDone = resolve
  })
  let settled = false
  const settle = (ok: boolean, timedOut = false) => {
    if (settled) return
    settled = true
    resolveDone({ ok, timedOut })
  }

  // TextureLoader.load returns the Texture immediately and fills `image` asynchronously.
  const texture = loader.load(
    url,
    () => settle(true),
    undefined,
    (err) => {
      console.warn(`[A2] texture failed to load: ${url}`, err)
      settle(false)
    },
  )
  texture.colorSpace = colorSpace
  texture.anisotropy = anisotropy
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  window.setTimeout(() => settle(false, true), LOAD_TIMEOUT_MS)
  return { texture, done }
}

/**
 * Starts the real critical-asset loads. This is a real network gate: if the mineral
 * texture is slow, the built state holds and no hero is shown early.
 */
export function createCriticalAssets(loader: THREE.TextureLoader, anisotropy: number): CriticalAssets {
  const mineral = loadTracked(loader, MINERAL_TEXTURE_URL, anisotropy, THREE.NoColorSpace)
  const contact = loadTracked(loader, CONTACT_SHADOW_URL, anisotropy, THREE.NoColorSpace)

  const ready = Promise.all([mineral.done, contact.done]).then(([a, b]) => {
    const status: AssetStatus = {
      mineral: a.ok,
      contact: b.ok,
      timedOut: a.timedOut || b.timedOut,
      fallback: !a.ok || !b.ok,
    }
    return status
  })

  return { textures: { mineral: mineral.texture, contact: contact.texture }, ready }
}

export async function loadFontBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`font fetch failed: ${res.status} ${res.statusText} (${url})`)
  const buffer = await res.arrayBuffer()
  if (buffer.byteLength < 1024) throw new Error(`font payload too small: ${buffer.byteLength} bytes`)
  return buffer
}
