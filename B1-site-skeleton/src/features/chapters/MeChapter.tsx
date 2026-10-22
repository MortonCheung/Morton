import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { me } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'

const meta = chapterById('M')

export function MeChapter({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const copy = section.querySelector<HTMLElement>('.ch-me__copy')
      const facts = section.querySelectorAll<HTMLElement>('.facts__row')
      const disclosure = section.querySelector<HTMLElement>('.disclosure')
      const lead = section.querySelector<HTMLElement>('.ch-me__copy .lead')
      if (!copy) return
      // Primary copy stays readable for the whole chapter (no opacity gate), so
      // the cross-slide between chapters is never an empty screen.
      if (lead) tl.fromTo(lead, { y: 26, opacity: 0.35 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
      tl.fromTo(copy, { y: 18 }, { y: 0, duration: 0.6, ease: 'none' }, 0)
      tl.fromTo(facts, { autoAlpha: 0.25, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.16, stagger: 0.07 }, 0.1)
      if (disclosure) tl.fromTo(disclosure, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.14 }, 0.34)
    },
    [],
    reduced,
  )

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={me.stamp} className="ch-me">
      <div className="chapter__grid ch-me__grid">
        <div className="ch-me__void" aria-hidden="true" data-letter-anchor />
        <div className="ch-me__copy">
          <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
          <h2 className="display ch-me__title" id="chapter-title-M">
            <span className="mask" data-mask>
              <span>把自己放在</span>
            </span>
            <span className="mask" data-mask>
              <span>
                <em>[待填方向]</em> 这条线上。
              </span>
            </span>
          </h2>
          <p className="lead" data-fade>
            {me.statement}
          </p>
          <dl className="facts" data-fade>
            {me.facts.map((fact) => (
              <div className="facts__row" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <details className="disclosure" data-fade>
            <summary>
              <span>{me.expandLabel}</span>
              <span className="disclosure__icon" aria-hidden="true" />
            </summary>
            <div className="disclosure__body">
              {me.expand.map((paragraph) => (
                <p key={paragraph.slice(0, 12)}>{paragraph}</p>
              ))}
            </div>
          </details>
        </div>
      </div>
      <p className="chapter__hint" aria-hidden="true">
        M — 字母向前一步
      </p>
    </ChapterShell>
  )
}
