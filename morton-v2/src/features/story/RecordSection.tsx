/**
 * Record — the journey, as an editorial index rather than a timeline graphic.
 * Each row: year · statement · one plate. Ratios differ per row on purpose.
 */
import { Plate } from '../../styleframes/parts'
import { RECORD } from '../../data/site'

export function RecordSection() {
  return (
    <section id="record" className="site-section section-record" aria-labelledby="record-title">
      <header className="section-record__head" data-reveal>
        <span className="label">02 — RECORD</span>
        <h2 id="record-title" className="title-lg">
          A record of what was made, and with whom.
        </h2>
      </header>

      <ol className="record-list">
        {RECORD.map((row, i) => (
          <li className="record-list__row" key={row.title} data-reveal>
            <span className="record-list__year label">{row.year}</span>
            <div className="record-list__text">
              <h3 className="record-list__title">{row.title}</h3>
              <p className="body-copy">{row.body}</p>
              <span className="label record-list__index">0{i + 1} / 03</span>
            </div>
            <div className={`record-list__plate record-list__plate--${i}`}>
              <Plate id={row.plate} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
