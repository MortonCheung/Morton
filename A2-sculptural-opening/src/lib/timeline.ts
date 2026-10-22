/**
 * Opening-state + timing probe.
 *
 * Every prototype MUST expose this on window.__MORTON__ so that the automated
 * browser checks can verify the real animation timings instead of trusting a
 * self-report. This is a testability contract, not a design decision.
 *
 * Required states, in order: loading -> drawing -> built -> expanding -> hero
 * (a reduced-motion path may jump from loading to reduced and must say so).
 */
export type OpeningState = 'loading' | 'drawing' | 'built' | 'expanding' | 'hero' | 'reduced'

export interface DetailState {
  open: boolean
  sourceId: string | null
}

export interface MortonProbe {
  state: OpeningState
  /** ms relative to page navigation, recorded with performance.now() */
  timings: Record<string, number>
  /** per-letter transform snapshot — proves the six letters are independently controllable */
  letters: Array<{ id: string; position: [number, number, number]; rotation: [number, number, number]; visible: boolean }>
  /** number of opening runs (initial load + replays) */
  runs: number
  detail?: DetailState
  /** free-form debug payload, e.g. renderer.info numbers */
  extra?: Record<string, unknown>
}

declare global {
  interface Window {
    __MORTON__?: MortonProbe
    __MORTON_DEBUG__?: {
      stats: () => Record<string, unknown>
      setLetter: (
        index: number,
        patch: {
          position?: [number, number, number]
          rotation?: [number, number, number]
          visible?: boolean
        },
      ) => void
      resetLetters: () => void
      replay: () => void
      dispose: () => void
      info: () => Record<string, unknown>
    }
  }
}

const probe: MortonProbe = { state: 'loading', timings: {}, letters: [], runs: 0 }

export function installProbe(): MortonProbe {
  probe.state = 'loading'
  probe.timings = { mountedAt: 0 }
  probe.letters = []
  probe.extra = undefined
  probe.runs = 0
  window.__MORTON__ = probe
  return probe
}

/**
 * Starts a new measured run. Keeps `mountedAt` (page navigation origin) and records the
 * replay origin, so replay timings can be measured without losing the first-load contract.
 */
export function beginRun(replay: boolean): MortonProbe {
  const now = Math.round(performance.now())
  const timings: Record<string, number> = { mountedAt: 0 }
  if (replay) timings.replayAt = now
  probe.timings = timings
  probe.state = 'loading'
  probe.letters = []
  probe.runs += 1
  window.__MORTON__ = probe
  return probe
}

export function setState(state: OpeningState): void {
  probe.state = state
  probe.timings[`${state}At`] = Math.round(performance.now())
  window.__MORTON__ = probe
}

export function mark(name: string): void {
  probe.timings[name] = Math.round(performance.now())
  window.__MORTON__ = probe
}

export function setLetters(letters: MortonProbe['letters']): void {
  probe.letters = letters
  window.__MORTON__ = probe
}

export function setDetail(detail: DetailState): void {
  probe.detail = detail
  window.__MORTON__ = probe
}

export function setExtra(extra: Record<string, unknown>): void {
  probe.extra = { ...probe.extra, ...extra }
  window.__MORTON__ = probe
}
