/**
 * Opening-state + timing probe.
 *
 * Every prototype MUST expose this on window.__MORTON__ so that the automated
 * browser checks can verify the real animation timings instead of trusting a
 * self-report. This is a testability contract, not a design decision.
 *
 * Required states, in order: loading -> drawing -> built -> expanding -> hero
 * (a reduced-motion path may jump straight from loading to hero and must say so).
 */
export type OpeningState = 'loading' | 'drawing' | 'built' | 'expanding' | 'hero' | 'reduced'

export interface DetailState {
  open: boolean
  sourceId: string | null
}

export interface MortonProbe {
  state: OpeningState
  /** ms relative to page mount, recorded with performance.now() */
  timings: Record<string, number>
  /** per-letter transform snapshot — proves the six letters are independently controllable */
  letters: Array<{ id: string; position: [number, number, number]; rotation: [number, number, number]; visible: boolean }>
  detail?: DetailState
  /** free-form debug payload, e.g. renderer.info numbers */
  extra?: Record<string, unknown>
}

declare global {
  interface Window {
    __MORTON__?: MortonProbe
  }
}

const probe: MortonProbe = { state: 'loading', timings: {}, letters: [] }

export function installProbe(): MortonProbe {
  const t0 = performance.now()
  probe.timings.mountedAt = 0
  window.__MORTON__ = probe
  void t0
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

/**
 * Clear every timing/letter snapshot so a replay is measured on its own run
 * instead of inheriting the first mount's numbers. Keeps the probe contract.
 */
let runIndex = 0

export function resetTimings(): void {
  for (const key of Object.keys(probe.timings)) delete probe.timings[key]
  // First run keeps the page-mount origin (0) so totalMs is measured from load;
  // a replay gets its own origin so repeated runs do not inherit old numbers.
  probe.timings.mountedAt = runIndex === 0 ? 0 : Math.round(performance.now())
  runIndex += 1
  probe.letters = []
  probe.extra = {}
  probe.state = 'loading'
  window.__MORTON__ = probe
}

/** Radians rounded to a stable precision for probe snapshots. */
export function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}
