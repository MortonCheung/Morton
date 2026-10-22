import type { LetterSnapshot } from '../scenes/OpeningScene'

declare global {
  interface Window {
    __MORTON_DEBUG__?: {
      nudgeLetter: (id: string, rotation: [number, number, number]) => boolean
      letters: () => LetterSnapshot[]
      stats: () => Record<string, unknown>
      replay: () => void
    }
  }
}

export {}
