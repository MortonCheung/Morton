import { COPY, STATE_COPY } from '../data/copy'
import type { OpeningState } from '../lib/timeline'

interface OverlayProps {
  state: OpeningState
  error: string | null
  onReplay: () => void
}

const REPLAYABLE: OpeningState[] = ['hero', 'reduced']

/**
 * Typographic chrome only. It never draws the mark and it never fakes progress:
 * the state line reports the real opening state, then becomes the hero sentence.
 */
export function Overlay({ state, error, onReplay }: OverlayProps) {
  const canReplay = REPLAYABLE.includes(state)

  return (
    <>
      <h1 className="sr-only">MORTON — personal identity</h1>

      <div className="chrome" data-phase={state}>
        <header className="chrome__top">
          <div className="identity">
            <span className="identity__name">{COPY.identity}</span>
            <span className="identity__role">{COPY.subIdentity}</span>
          </div>

          <button
            type="button"
            className="replay"
            data-replay
            onClick={onReplay}
            disabled={!canReplay}
            aria-label="Replay the MORTON opening"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M13.1 6.2A5.4 5.4 0 1 0 13.4 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <path d="M13.2 2.6v3.7H9.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{COPY.replay}</span>
          </button>
        </header>

        <footer className="chrome__bottom">
          <span className="chapter">{COPY.chapter}</span>
          <p className="state-line" aria-live="polite">
            {STATE_COPY[state]}
          </p>
          <span className="edition" aria-hidden="true">
            M
          </span>
        </footer>
      </div>

      {error && (
        <div className="fatal" role="alert">
          <div className="fatal__panel">
            <p className="fatal__eyebrow">ERROR / {error}</p>
            <h2 className="fatal__title">{COPY.errorTitle}</h2>
            <p className="fatal__body">{COPY.errorBody}</p>
            <button type="button" className="fatal__button" onClick={() => window.location.reload()}>
              {COPY.retry}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
