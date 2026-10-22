/**
 * QA-only URL flags. They exist so the acceptance paths can be exercised in a
 * real browser; they never change the production default path.
 *
 *   ?assetDelay=2500   delay the real font response (test "built, waiting")
 *   ?motion=reduced    force the reduced-motion path
 *   ?freeze=built      stop in the built state (inspect line/face alignment)
 *   ?freeze=mid        pause the reveal at 55% (inspect the hand-off)
 *   ?freeze=handoff    pause the reveal at 12% (line/solid alignment proof)
 *   ?debug=1           expose window.__MORTON_DEBUG__ for the QA script
 */
export interface QaFlags {
  assetDelayMs: number
  forceReduced: boolean
  freeze: 'none' | 'built' | 'mid' | 'handoff'
  debug: boolean
}

export function readQaFlags(search: string = window.location.search): QaFlags {
  const params = new URLSearchParams(search)
  const delay = Number(params.get('assetDelay') ?? 0)
  const freeze = params.get('freeze')
  return {
    assetDelayMs: Number.isFinite(delay) ? Math.min(Math.max(delay, 0), 20000) : 0,
    forceReduced: params.get('motion') === 'reduced',
    freeze: freeze === 'built' || freeze === 'mid' || freeze === 'handoff' ? freeze : 'none',
    debug: params.get('debug') === '1',
  }
}
