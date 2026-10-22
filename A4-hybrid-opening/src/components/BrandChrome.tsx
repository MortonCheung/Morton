import type { OpeningState } from '../lib/timeline'

const STATUS: Record<OpeningState, string> = {
  loading: 'MORTON is preparing',
  drawing: 'MORTON is being drawn',
  built: 'MORTON is formed, waiting for the surface to be ready',
  expanding: 'Material and light arrive',
  hero: 'MORTON opening complete',
  reduced: 'MORTON opening complete, reduced motion',
}

interface BrandChromeProps {
  phase: OpeningState
  onReplay: () => void
}

/**
 * Composition-first chrome: one small label, one short line, one continue cue,
 * one replay control. Nothing else competes with the wordmark.
 */
export function BrandChrome({ phase, onReplay }: BrandChromeProps) {
  const interactive = phase === 'hero' || phase === 'reduced'
  return (
    <>
      <header className="chrome chrome--top">
        <div className="brandlock">
          <span className="brandlock__name">MORTON</span>
          <span className="brandlock__rule" aria-hidden="true" />
          <span className="brandlock__meta">PERSONAL IDENTITY</span>
        </div>
        <button
          type="button"
          className="replay"
          data-replay
          onClick={onReplay}
          disabled={!interactive}
          aria-label="Replay the MORTON opening"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M13.1 5.7A5.4 5.4 0 1 0 13.3 9.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeLinecap="round"
            />
            <path
              d="M13.5 2.5v3.6H9.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>REPLAY</span>
        </button>
      </header>

      <div className="chrome chrome--caption">
        <p>A personal practice in form, motion and material.</p>
      </div>

      <div className="chrome chrome--cue" aria-hidden="true">
        <span>SCROLL</span>
        <i className="cue__line" />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {STATUS[phase]}
      </p>
    </>
  )
}
