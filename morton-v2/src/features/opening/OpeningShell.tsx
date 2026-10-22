/**
 * Opening shell: the final hero is mounted and painted from t=0 behind two opaque
 * paper sheets. The sheets carry the *same* full-viewport line art (one coordinate
 * system), the seam carries the progress track, and the reveal moves both sheets
 * away from the centre line like a sheet of paper opening.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { OpeningArt } from './OpeningArt'
import { useOpeningSequence } from './useOpeningSequence'
import './opening.css'

export function OpeningShell({ children }: { children: ReactNode }) {
  const gateDelay = Number(new URLSearchParams(window.location.search).get('gateDelay') || 0)
  const { rootRef, state } = useOpeningSequence(Number.isFinite(gateDelay) ? gateDelay : 0)
  const [variant, setVariant] = useState<'desktop' | 'mobile'>(() =>
    window.matchMedia('(max-width: 719px)').matches ? 'mobile' : 'desktop',
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 719px)')
    const on = () => setVariant(mq.matches ? 'mobile' : 'desktop')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  return (
    <div className="opening-root" ref={rootRef} data-phase="boot" data-state={state}>
      <div className="opening-final" data-final-hero>
        {children}
      </div>

      <div className="opening-cover" data-cover aria-hidden="true">
        <div className="opening-sheet opening-sheet--top" data-sheet="top">
          <OpeningArt variant={variant} />
        </div>
        <div className="opening-sheet opening-sheet--bottom" data-sheet="bottom">
          <OpeningArt variant={variant} />
        </div>
        <div className="opening-seam">
          <div className="opening-seam__track" />
          <div className="opening-seam__fill" data-progress />
        </div>
        <p className="opening-note label">MORTON — [待补副标题]</p>
      </div>
    </div>
  )
}
