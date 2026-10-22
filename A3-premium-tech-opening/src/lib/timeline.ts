/**
 * Opening-state + timing probe.
 *
 * Every prototype MUST expose this on window.__MORTON__ so that the automated
 * browser checks can verify the real animation timings instead of trusting a
 * self-report. This is a testability contract, not a design decision.
 *
 * Required states, in order: loading -> drawing -> built -> expanding -> hero
 * (the reduced-motion path goes loading -> reduced and says so in `extra`).
 */
export type OpeningState = 'loading' | 'drawing' | 'built' | 'expanding' | 'hero' | 'reduced'

export interface ProbeLetter {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  visible: boolean
}

export interface DetailState {
  open: boolean
  sourceId: string | null
}

export interface MortonProbe {
  state: OpeningState
  /** ms relative to page navigation, recorded with performance.now() */
  timings: Record<string, number>
  /** per-letter transform snapshot — proves the six letters are independently controllable */
  letters: ProbeLetter[]
  detail?: DetailState
  /** free-form debug payload, e.g. renderer.info numbers */
  extra?: Record<string, unknown>
}

declare global {
  interface Window {
    __MORTON__?: MortonProbe
    __MORTON_DEBUG__?: {
      setLetter: (index: number, patch: { rotationY?: number; positionX?: number; visible?: boolean }) => void
      resetLetters: () => void
      rendererInfo: () => Record<string, unknown> | null
      snapshot: () => MortonProbe | null
    }
  }
}

const probe: MortonProbe = { state: 'loading', timings: {}, letters: [] }

export function installProbe(): MortonProbe {
  probe.timings.mountedAt = Math.round(performance.now())
  window.__MORTON__ = probe
  return probe
}

export function setState(state: OpeningState): void {
  probe.state = state
  const key = `${state}At`
  if (!(key in probe.timings)) probe.timings[key] = Math.round(performance.now())
  window.__MORTON__ = probe
}

export function mark(name: string): void {
  probe.timings[name] = Math.round(performance.now())
  window.__MORTON__ = probe
}

export function setLetters(letters: ProbeLetter[]): void {
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

export function getProbe(): MortonProbe {
  return probe
}
