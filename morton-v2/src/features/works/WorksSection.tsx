/**
 * Selected works — the exhibition section (dark ground, one dominant exhibit,
 * three unequal secondary exhibits, a numbered index rail).
 *
 * The exhibits are buttons: opening one hands the source rect to the focus layer,
 * which FLIPs from that exact rectangle. That is what makes "back to works"
 * return to the same object rather than to a route.
 */
import { Plate } from '../../styleframes/parts'
import { WORKS, type Work } from '../../data/site'

export interface OpenRequest {
  work: Work
  rect: DOMRect
}

export function WorksSection({ onOpen }: { onOpen: (req: OpenRequest) => void }) {
  const [main, ...rest] = WORKS
  return (
    <section id="works" className="site-section section-works" aria-labelledby="works-title">
      <header className="section-works__head" data-reveal>
        <span className="label">04 — WORKS / EXHIBITION</span>
        <span className="label section-works__count">Selected work — [年份]</span>
      </header>

      <div className="works-grid">
        <button
          type="button"
          className="exhibit exhibit--main"
          data-project-card
          data-work={main.id}
          onClick={(e) => onOpen({ work: main, rect: e.currentTarget.getBoundingClientRect() })}
          aria-label={`Open ${main.title}`}
        >
          <span className="exhibit__frame" style={{ aspectRatio: main.ratio }}>
            <Plate id={main.plate} loading="lazy" />
          </span>
          <span className="exhibit__caption">
            <span className="label">{main.index}</span>
            <span className="exhibit__title">{main.title}</span>
            <span className="label exhibit__meta">
              {main.type} · {main.year}
            </span>
          </span>
        </button>

        <div className="works-rail">
          {rest.slice(0, 2).map((w) => (
            <button
              key={w.id}
              type="button"
              className="exhibit exhibit--rail"
              data-project-card
              data-work={w.id}
              onClick={(e) => onOpen({ work: w, rect: e.currentTarget.getBoundingClientRect() })}
              aria-label={`Open ${w.title}`}
            >
              <span className="exhibit__frame" style={{ aspectRatio: w.ratio }}>
                <Plate id={w.plate} loading="lazy" />
              </span>
              <span className="exhibit__caption">
                <span className="label">{w.index}</span>
                <span className="exhibit__title">{w.title}</span>
                <span className="label exhibit__meta">{w.year}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="exhibit exhibit--wide"
          data-project-card
          data-work={rest[2].id}
          onClick={(e) => onOpen({ work: rest[2], rect: e.currentTarget.getBoundingClientRect() })}
          aria-label={`Open ${rest[2].title}`}
        >
          <span className="exhibit__frame" style={{ aspectRatio: rest[2].ratio }}>
            <Plate id={rest[2].plate} loading="lazy" />
          </span>
          <span className="exhibit__caption">
            <span className="label">{rest[2].index}</span>
            <span className="exhibit__title">{rest[2].title}</span>
            <span className="label exhibit__meta">
              {rest[2].type} · {rest[2].year}
            </span>
          </span>
        </button>
      </div>

      <nav className="works-index" aria-label="All works">
        <span className="label works-index__head">Index</span>
        <span className="label works-index__count">05 — 06</span>
        <ul>
          {WORKS.slice(4).map((w) => (
            <li key={w.id}>
              <button
                type="button"
                data-project-card
                data-work={w.id}
                onClick={(e) => onOpen({ work: w, rect: e.currentTarget.getBoundingClientRect() })}
              >
                <span className="label">{w.index}</span>
                <span className="works-index__title">{w.title}</span>
                <span className="label">{w.type}</span>
                <span className="label">{w.year}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
