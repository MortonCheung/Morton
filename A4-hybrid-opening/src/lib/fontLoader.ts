import { buildWord, type WordBuild } from '../letters/buildWord'
import { OPENING } from './openingConfig'
import { mark } from './timeline'

export interface WordModel {
  buffer: ArrayBuffer
  build: WordBuild
}

const cache = new Map<string, Promise<WordModel>>()

/**
 * Fetch the licensed TTF once and build the per-glyph geometry.
 * A failed load is not cached, so a retry can recover.
 */
export function loadWordModel(url: string = OPENING.fontUrl): Promise<WordModel> {
  const cached = cache.get(url)
  if (cached) return cached
  const task = (async () => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`typeface request failed: ${response.status} ${url}`)
    mark('fontFetchedAt')
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength < 1024) throw new Error(`typeface payload too small: ${buffer.byteLength} bytes`)
    const build = buildWord(buffer, OPENING.word)
    mark('fontBuiltAt')
    return { buffer, build }
  })()
  cache.set(url, task)
  task.catch(() => cache.delete(url))
  return task
}
