import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { record } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'

const meta = chapterById('R')

export function RecordChapter({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const body = section.querySelector<HTMLElement>('.ch-record__body')
      const rows = section.querySelectorAll<HTMLElement>('.record-row')
      const rail = section.querySelector<HTMLElement>('.record-rail__fill')
      if (body) tl.fromTo(body, { y: 20 }, { y: 0, duration: 0.55, ease: 'none' }, 0)
      if (rail) tl.fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: 0.86, ease: 'none' }, 0)
      rows.forEach((row, index) => {
        const at = 0.1 + index * 0.15
        tl.fromTo(
          row,
          { autoAlpha: 0.22, x: 24 },
          { autoAlpha: 1, x: 0, duration: 0.13, ease: 'power2.out' },
          at,
        )
        tl.fromTo(
          row.querySelector('.record-row__rule'),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.15, ease: 'power2.out', transformOrigin: 'left center' },
          at,
        )
      })
    },
    [],
    reduced,
  )

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={record.stamp} className="ch-record">
      <span className="ch-record__anchor" aria-hidden="true" data-letter-anchor />
      <div className="ch-record__body">
        <div className="ch-record__head">
          <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
          <div className="ch-record__head-grid">
            <h2 className="display ch-record__title" id="chapter-title-R">
              做过的事，
              <br />
              按时间排在一条线上。
            </h2>
            <p className="lead ch-record__intro">{record.intro}</p>
          </div>
        </div>

        <div className="ch-record__ledger">
          <div className="record-rail" aria-hidden="true">
            <span className="record-rail__line" />
            <span className="record-rail__fill" />
          </div>
          <ol className="record-list">
            {record.entries.map((entry) => (
              <li className="record-row" key={entry.id}>
                <span className="record-row__rule" aria-hidden="true" />
                <div className="record-row__top">
                  <span className="record-row__period">{entry.period}</span>
                  <span className="record-row__org">{entry.org}</span>
                  <span className="record-row__role">{entry.role}</span>
                </div>
                <p className="record-row__line">{entry.line}</p>
                {entry.detail ? (
                  <details className="record-detail">
                    <summary>
                      <span>展开这段记录</span>
                      <span className="disclosure__icon" aria-hidden="true" />
                    </summary>
                    <div className="record-detail__body">
                      {entry.detail.map((paragraph) => (
                        <p key={paragraph.slice(0, 10)}>{paragraph}</p>
                      ))}
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ChapterShell>
  )
}
