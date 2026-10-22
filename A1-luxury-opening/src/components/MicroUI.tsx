import type { RefObject } from 'react'
import { COPY } from '../data/content'
import type { OpeningPhase } from '../types/opening'

interface MicroUIProps {
  phase: OpeningPhase
  reducedMotion: boolean
  error: string | null
  onReplay: () => void
  progressRef: RefObject<HTMLElement | null>
}

/** Micro UI only: a lockup, one line, one status, one replay control. */
export function MicroUI({ phase, reducedMotion, error, onReplay, progressRef }: MicroUIProps) {
  const status = error
    ? error === 'WEBGL_UNAVAILABLE'
      ? COPY.webgl
      : COPY.error
    : COPY.status[phase]

  return (
    <>
      <header className="hud hud--top">
        <div className="lockup">
          <span className="lockup__mark">{COPY.mark}</span>
          <span className="lockup__sub">{COPY.subtitle}</span>
        </div>
        <div className="index" aria-hidden="true">
          <span className="index__number">{COPY.index}</span>
          <span className="index__rule" />
          <span className="index__label">{COPY.indexLabel}</span>
        </div>
      </header>

      <footer className="hud hud--bottom">
        <div className="hud__note">
          <p className="hud__line">{COPY.line}</p>
          <div className="status" data-status={phase} aria-hidden="true">
            <span className="status__text">{status}</span>
            {reducedMotion && phase !== 'loading' ? <span className="status__tag">REDUCED</span> : null}
          </div>
          <div className="progress" aria-hidden="true">
            <i ref={progressRef} className="progress__bar" />
          </div>
        </div>

        <button type="button" className="replay" data-replay onClick={onReplay} aria-label="Replay the opening">
          <span className="replay__ring">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M17.6 4.4v3.9h-3.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="replay__label">{COPY.replay}</span>
          <kbd className="replay__key">{COPY.replayHint}</kbd>
        </button>
      </footer>
    </>
  )
}
