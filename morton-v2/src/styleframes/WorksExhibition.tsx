/**
 * 03 · WORKS / EXHIBITION — 1440×900 / 390×844
 *
 * A dark gallery chapter: the main exhibit is a 62vw 16:9 plate bleeding off
 * the left edge; three secondary plates sit at three different ratios in the
 * right column; the remaining works are listed as a dense typographic index,
 * not as more cards. Read left → right: one large, three small, one dense strip.
 */
import { Plate, plateLabel } from './parts'

const INDEX = [
  ['05', '[作品 05]', '[项目类型]', '[年份]'],
  ['06', '[作品 06]', '[项目类型]', '[年份]'],
  ['07', '[作品 07]', '[项目类型]', '[年份]'],
  ['08', '[作品 08]', '[项目类型]', '[年份]'],
]

export default function WorksExhibition() {
  return (
    <section className="sf sf-works" data-frame="03-works-exhibition">
      <header className="sf-works__head">
        <p className="label sf-works__kicker">03 — WORKS / EXHIBITION</p>
        <p className="label label--muted sf-works__meta">SELECTED WORK — [年份]</p>
      </header>
      <span className="sf-works__head-rule" aria-hidden="true" />

      <Plate id="p02" className="sf-works__main" />
      <div className="sf-works__caption sf-works__caption--main">
        <span className="label label--muted">01</span>
        <span className="sf-works__name">[作品 01]</span>
        <span className="label label--muted">[项目类型]</span>
        <span className="label label--muted">[年份]</span>
      </div>

      <Plate id="p07" className="sf-works__a" />
      <div className="sf-works__caption sf-works__caption--a">
        <span className="label label--muted">02</span>
        <span className="sf-works__name">[作品 02]</span>
        <span className="label label--muted">[年份]</span>
      </div>

      <Plate id="p01" className="sf-works__b" />
      <div className="sf-works__caption sf-works__caption--b">
        <span className="label label--muted">03</span>
        <span className="sf-works__name">[作品 03]</span>
        <span className="label label--muted">[年份]</span>
      </div>

      <Plate id="p07b" className="sf-works__c" />
      <div className="sf-works__caption sf-works__caption--c">
        <span className="label label--muted">04</span>
        <span className="sf-works__name">[作品 04]</span>
        <span className="label label--muted">[年份]</span>
      </div>

      <div className="sf-works__index">
        <div className="sf-works__index-head">
          <span className="label">INDEX</span>
          <span className="label label--muted">05 — 08</span>
        </div>
        <div className="sf-works__index-row">
          {INDEX.map((it) => (
            <div className="sf-works__index-item" key={it[0]}>
              <span className="label label--muted">{it[0]}</span>
              <span className="sf-works__index-name">{it[1]}</span>
              <span className="sf-works__index-type">{it[2]}</span>
              <span className="label label--muted">{it[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
