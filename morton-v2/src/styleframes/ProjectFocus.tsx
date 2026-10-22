/**
 * 04 · PROJECT FOCUS — 1440×900 / 1440×700 / 390×844
 *
 * The exhibit bleeds off the top, left and bottom (52vw). Its 2:1 detail is a
 * physical inset on the exhibit — a magnified patch, not another card. The
 * right column is a product-level record: back control, title, a 2×2 meta
 * table on 1px rules, a 34ch note, and a plate register at the foot.
 */
import { Plate, Wordmark, plateLabel } from './parts'

const META = [
  ['ROLE', '[角色]'],
  ['YEAR', '[年份]'],
  ['TYPE', '[项目类型]'],
  ['STATUS', '[状态]'],
]

export default function ProjectFocus() {
  return (
    <section className="sf sf-focus" data-frame="04-project-focus">
      <div className="sf-focus__exhibit">
        <Plate id="p06" className="sf-focus__image" />
        <p className="caption sf-focus__plate-label">{plateLabel('p06')}</p>
        <figure className="sf-focus__detail-wrap">
          <Plate id="p01" className="sf-focus__detail" />
          <figcaption className="caption sf-focus__detail-label">DETAIL — 2:1 / P.01</figcaption>
        </figure>
      </div>

      <a className="sf-focus__back" href="#/03-works-exhibition">
        Back to works
        <span aria-hidden="true">←</span>
      </a>

      <p className="label label--muted sf-focus__kicker">04 — PROJECT FOCUS</p>

      <h1 className="display sf-focus__title">
        Material
        <br />
        study
      </h1>

      <div className="sf-focus__meta">
        {META.map(([k, v]) => (
          <div className="sf-focus__cell" key={k}>
            <span className="label label--muted">{k}</span>
            <span className="sf-focus__value">{v}</span>
          </div>
        ))}
      </div>

      <p className="body-copy sf-focus__note">
        A study in surface and edge: the plate is photographed as a material
        sample, then set against a single measure. The project asks how little
        information a page needs before it becomes an exhibit.
      </p>

      <div className="sf-focus__register">
        <span className="label label--muted">PLATE</span>
        <span className="sf-focus__register-value">P.06 — LACQUER STUDY</span>
        <span className="label label--muted">DETAIL</span>
        <span className="sf-focus__register-value">P.01 — PAPER / 2:1</span>
      </div>

      <Wordmark mark="serif" className="sf-focus__foot-mark" />
    </section>
  )
}
