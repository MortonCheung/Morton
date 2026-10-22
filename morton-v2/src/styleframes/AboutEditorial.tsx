/**
 * 02 · ABOUT / RECORD — 1440×900 / 390×844
 *
 * Asymmetric: a 4:5 linen plate bleeds off the left edge; the display title
 * starts *inside* the plate and crosses its right edge onto paper. Copy column
 * is 29vw / 34ch. A three-row archive with 1px rules is the dense block; the
 * right margin and the top strip are the quiet ones.
 */
import { Plate, plateLabel } from './parts'

const ARCHIVE = [
  ['[年份]', '[档案条目 01]', '[地点]'],
  ['[年份]', '[档案条目 02]', '[地点]'],
  ['[年份]', '[档案条目 03]', '[地点]'],
]

export default function AboutEditorial() {
  return (
    <section className="sf sf-about" data-frame="02-about-editorial">
      <Plate id="p01" className="sf-about__image" />
      <p className="label label--muted sf-about__plate-label">{plateLabel('p01')}</p>

      <h1 className="display sf-about__title">
        Material
        <br />
        measure
        <br />
        record
      </h1>

      <div className="sf-about__copy">
        <p className="label label--muted sf-about__index">02 — ABOUT / RECORD</p>
        <p className="read-copy sf-about__para">
          A practice organised around material, measure and the printed page:
          art direction, editorial systems and exhibition design for archives,
          studios and independent publishers.
        </p>
      </div>

      <div className="sf-about__archive">
        <div className="sf-about__archive-head">
          <span className="label">ARCHIVE</span>
          <span className="label label--muted">03 ENTRIES</span>
        </div>
        {ARCHIVE.map((row, i) => (
          <div className="sf-about__entry" key={i}>
            <span className="sf-about__year">{row[0]}</span>
            <span className="sf-about__what">{row[1]}</span>
            <span className="sf-about__where">{row[2]}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
