/**
 * Making — the working method, stated once and shown three times.
 * Quiet section: paper ground, one large statement, three material steps.
 */
import { Plate } from '../../styleframes/parts'
import { MAKING } from '../../data/site'

export function MakingSection() {
  return (
    <section id="making" className="site-section section-making" aria-labelledby="making-title">
      <header className="section-making__head" data-reveal>
        <span className="label">03 — MAKING</span>
        <h2 id="making-title" className="display section-making__statement">
          {MAKING.statement}
        </h2>
      </header>

      <div className="making-steps">
        {MAKING.steps.map((step, i) => (
          <article className="making-step" key={step.label} data-reveal>
            <div className="making-step__plate">
              <Plate id={step.plate} />
            </div>
            <div className="making-step__meta">
              <span className="label">0{i + 1}</span>
              <h3 className="making-step__label">{step.label}</h3>
            </div>
            <p className="body-copy">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
