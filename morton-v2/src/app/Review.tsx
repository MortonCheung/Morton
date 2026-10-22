/**
 * Review index — the page the user opens first.
 * The five styleframes are the deliverable; this page only indexes them and
 * states the review status. Same tokens as the frames (paper, 1px rules,
 * 11px labels, Bodoni display, the constructed wordmark).
 */
import type { FrameEntry } from './frames'
import { Wordmark } from '../styleframes/parts'

export default function Review({ frames }: { frames: FrameEntry[] }) {
  return (
    <main className="review">
      <header className="review__head">
        <div className="review__mark">
          <Wordmark mark="serif" />
        </div>
        <p className="label review__kicker">MORTON V2 · PHASE 1 · STYLEFRAMES</p>
        <div className="review__status">
          <span className="label label--muted">STATUS</span>
          <span className="label">PENDING VISUAL APPROVAL</span>
        </div>
      </header>

      <section className="review__intro">
        <p className="read-copy">
          Five frames from one art system: paper, one material plate, a constructed
          wordmark, and a baseline that runs through either. Open a frame full
          bleed; screenshots are captured at 1440×900, 1440×700 and 390×844.
        </p>
        <p className="caption review__meta">
          Wordmark construction and the three cuts: docs/art-direction/WORDMARK.md
          <br />
          Art direction, typography, tokens, assets, review: docs/art-direction/
        </p>
      </section>

      <ol className="review__list">
        {frames.map((f) => (
          <li key={f.id} className="review__item">
            <a href={`#/${f.id}`} className="review__link">
              <span className="label label--muted review__num">{f.id.slice(0, 2)}</span>
              <span className="review__body">
                <span className="review__title">{f.title}</span>
                <span className="caption">{f.note}</span>
              </span>
              <span className="label review__open">OPEN →</span>
            </a>
          </li>
        ))}
      </ol>

      <footer className="review__foot">
        <span className="label label--muted">MORTON — 01 — 05</span>
        <span className="caption">Original placeholder material studies · no third-party assets</span>
      </footer>
    </main>
  )
}
