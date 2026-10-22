import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { next } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'

const meta = chapterById('N')

export function NextChapter({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const body = section.querySelector<HTMLElement>('.ch-next__body')
      const directions = section.querySelectorAll<HTMLElement>('.ch-next__direction')
      const links = section.querySelectorAll<HTMLElement>('.ch-next__link')
      const closing = section.querySelector<HTMLElement>('.ch-next__closing')
      if (body) tl.fromTo(body, { y: 18 }, { y: 0, duration: 0.55, ease: 'none' }, 0)
      tl.from(directions, { autoAlpha: 0, x: 18, duration: 0.12, stagger: 0.04, ease: 'power2.out' }, 0.1)
      tl.from(links, { autoAlpha: 0, y: 18, duration: 0.12, stagger: 0.04, ease: 'power2.out' }, 0.28)
      if (body) tl.to(body, { autoAlpha: 0, y: -14, duration: 0.1, ease: 'power1.in' }, 0.64)
      if (closing) tl.fromTo(closing, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'power1.out' }, 0.72)
    },
    [],
    reduced,
  )

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={next.stamp} className="ch-next">
      <span className="ch-next__anchor" aria-hidden="true" data-letter-anchor />
      <div className="ch-next__body">
        <div className="ch-next__head">
          <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
          <div className="ch-next__head-grid">
            <h2 className="display ch-next__title" id="chapter-title-N">
              下一步，
              <br />
              以及怎样找到我。
            </h2>
            <p className="lead ch-next__statement">{next.statement}</p>
          </div>
        </div>

        <ul className="ch-next__directions">
          {next.directions.map((direction, index) => (
            <li className="ch-next__direction" key={direction.label}>
              <span className="ch-next__direction-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="ch-next__direction-label">{direction.label}</span>
              <span className="ch-next__direction-note">{direction.note}</span>
            </li>
          ))}
        </ul>

        <div className="ch-next__links">
          <p className="ch-next__links-label">联系入口 / 占位</p>
          <ul className="ch-next__link-list">
            {next.links.map((link) => (
              <li key={link.label}>
                <span className="ch-next__link">
                  <span className="ch-next__link-name">{link.label}</span>
                  <span className="ch-next__link-value">{link.value}</span>
                  <span className="ch-next__link-arrow" aria-hidden="true">
                    ↗
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="ch-next__footnote">以上入口均为占位，不指向任何真实账号或文件。</p>
      </div>

      <div className="ch-next__closing">
        <p className="ch-next__closing-note">{next.closingNote}</p>
        <div className="ch-next__closing-row">
          <span>{next.footerNote}</span>
          <button type="button" className="ch-next__top" onClick={backToTop}>
            回到顶部 <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </ChapterShell>
  )
}
