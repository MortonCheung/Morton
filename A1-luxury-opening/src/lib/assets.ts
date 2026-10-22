/** Real resource loading for the opening. Nothing here fakes progress. */

export const FONT_URL = './fonts/marcellus.ttf'
export const UI_FONT = 'Marcellus'

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface FontLoadOptions {
  /** QA only: delay the response so the "built but not ready" state can be observed */
  delayMs?: number
  timeoutMs?: number
}

async function fetchBuffer(url: string, timeoutMs: number): Promise<ArrayBuffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`font request failed: ${response.status} ${response.statusText}`)
    return await response.arrayBuffer()
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch the real TTF (the file is also used by @font-face for the micro UI). */
export async function loadFontBuffer(options: FontLoadOptions = {}): Promise<ArrayBuffer> {
  const { delayMs = 0, timeoutMs = 12000 } = options
  if (delayMs > 0) await sleep(delayMs)
  const [buffer] = await Promise.all([fetchBuffer(FONT_URL, timeoutMs)])
  return buffer
}

/**
 * The browser's own font pipeline is a second, independent signal: if the
 * @font-face the UI depends on is not ready, the object is not ready either.
 * Bounded so a broken font can never dead-lock the opening.
 */
export async function waitForUiFont(timeoutMs = 5000): Promise<boolean> {
  if (!('fonts' in document)) return false
  try {
    const result = await Promise.race([
      (async () => {
        await document.fonts.load(`400 16px "${UI_FONT}"`)
        await document.fonts.ready
        return true
      })(),
      sleep(timeoutMs).then(() => false),
    ])
    return result === true && document.fonts.check(`400 16px "${UI_FONT}"`)
  } catch {
    return false
  }
}
