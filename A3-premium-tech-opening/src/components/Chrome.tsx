import { copy } from '../data/copy'
import type { OpeningState } from '../lib/timeline'

interface Props {
  state: OpeningState
  onReplay: () => void
}

export function Chrome({ state, onReplay }: Props) {
  const busy = state === 'loading' || state === 'drawing' || state === 'expanding'
  return (
    <>
      <p className="tagline">{copy.tagline}</p>

      <footer className="chrome">
        <div className="chrome__meta">
          <span className="chrome__brand">{copy.metaPrimary}</span>
          <span className="chrome__rule" aria-hidden="true" />
          <span>{copy.metaSecondary}</span>
        </div>

        <button
          type="button"
          className="chrome__replay"
          data-replay
          onClick={onReplay}
          aria-label="Replay the opening sequence"
          aria-busy={busy}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
            <path d="M13.1 8a5.1 5.1 0 1 1-1.5-3.6" strokeLinecap="round" />
            <path d="M13.4 2.9v3.2H10.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{copy.replay}</span>
        </button>
      </footer>

      <p className="sr-only" role="status" aria-live="polite">
        {copy.status[state]}
      </p>
    </>
  )
}
