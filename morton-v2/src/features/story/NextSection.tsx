/**
 * Next / contact — the closing plate. Echoes the hero's rule-and-margin logic
 * without repeating the hero composition.
 */
import { NEXT, SITE } from '../../data/site'
import { Wordmark } from '../../styleframes/parts'

export function NextSection() {
  return (
    <section id="next" className="site-section section-next" aria-labelledby="next-title">
      <div className="section-next__rule" aria-hidden="true" />
      <div className="section-next__grid">
        <span className="label section-next__kicker" data-reveal>
          05 — NEXT
        </span>
        <h2 id="next-title" className="display section-next__line" data-reveal>
          {NEXT.line}
        </h2>
        <p className="body-copy section-next__body" data-reveal>
          {NEXT.body}
        </p>
        <dl className="section-next__contact" data-reveal>
          <div>
            <dt className="label">Email</dt>
            <dd>{SITE.email}</dd>
          </div>
          <div>
            <dt className="label">Location</dt>
            <dd>{SITE.location}</dd>
          </div>
        </dl>
      </div>
      <div className="section-next__mark" data-reveal aria-hidden="true">
        <Wordmark mark="serif" />
      </div>
      <footer className="section-next__footer">
        <span className="label">MORTON — 2026</span>
        <span className="label">Phase 3 skeleton · placeholders in use</span>
      </footer>
    </section>
  )
}
