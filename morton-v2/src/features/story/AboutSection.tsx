/**
 * About / record — the editorial identity page.
 * Asymmetric: the paper plate bleeds off the left and top edges, a 112px display
 * line crosses the image's right edge, the archive table carries the density.
 */
import { Plate } from '../../styleframes/parts'
import { ABOUT } from '../../data/site'

export function AboutSection() {
  return (
    <section id="about" className="site-section section-about" aria-labelledby="about-title">
      <div className="section-about__figure" data-reveal>
        <Plate id="p01" loading="lazy" />
        <p className="label section-about__plate-label">P.01 — PAPER STUDY</p>
      </div>

      <div className="section-about__title" data-reveal>
        <span className="label section-about__kicker">01 — ABOUT / RECORD</span>
        <h2 id="about-title" className="display section-about__display">
          {ABOUT.display.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
      </div>

      <div className="section-about__copy" data-reveal>
        <p className="lede">{ABOUT.intro}</p>
        <div className="archive__head label">
          <span>Archive</span>
          <span>03 entries</span>
        </div>
        <table className="archive">
          <tbody>
            {ABOUT.entries.map((e) => (
              <tr key={e.title}>
                <td className="archive__year">{e.year}</td>
                <td className="archive__title">{e.title}</td>
                <td className="archive__place">{e.place}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
