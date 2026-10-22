import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { build } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'

const meta = chapterById('T')

export function BuildChapter({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const rail = section.querySelector<HTMLElement>('.ch-build__rail')
      const steps = section.querySelectorAll<HTMLElement>('.build-step')
      const panels = section.querySelectorAll<HTMLElement>('.build-panel')
      const progress = section.querySelector<HTMLElement>('.build-rail__fill')
      if (rail) tl.fromTo(rail, { y: 22 }, { y: 0, duration: 0.5, ease: 'none' }, 0)
      if (progress) tl.fromTo(progress, { scaleY: 0 }, { scaleY: 1, duration: 0.82, ease: 'none' }, 0.05)
      const start = 0.08
      const step = 0.26
      steps.forEach((el, index) => {
        const at = start + index * step
        if (index > 0) tl.fromTo(el, { autoAlpha: 0.3 }, { autoAlpha: 1, duration: 0.05 }, at)
        if (index < steps.length - 1) tl.to(el, { autoAlpha: 0.3, duration: 0.05 }, at + step * 0.86)
        const panel = panels[index]
        if (!panel) return
        if (index > 0) tl.fromTo(panel, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power2.out' }, at)
        if (index < panels.length - 1) tl.to(panel, { autoAlpha: 0, y: -20, duration: 0.07 }, at + step * 0.86)
      })
    },
    [],
    reduced,
  )

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={build.stamp} className="ch-build">
      <div className="chapter__grid ch-build__grid">
        <div className="ch-build__rail">
          <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
          <h2 className="display ch-build__title" id="chapter-title-T">
            T 的结构可以拆开，再装回去。
          </h2>
          <p className="ch-build__intro">{build.intro}</p>
          <ol className="build-rail">
            <span className="build-rail__track" aria-hidden="true">
              <span className="build-rail__fill" />
            </span>
            {build.steps.map((step) => (
              <li className="build-step" key={step.id}>
                <span className="build-step__index">{step.index}</span>
                <span className="build-step__label">{step.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="ch-build__gap" aria-hidden="true" data-letter-anchor />

        <div className="ch-build__body">
          <div className="build-panels">
            {build.steps.map((step) => (
              <article className="build-panel" key={step.id}>
                <p className="build-panel__index">{step.index} / 03</p>
                <h3 className="build-panel__title">{step.title}</h3>
                <p className="build-panel__body">{step.body}</p>
                <ul className="build-panel__notes">
                  {step.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <p className="build-panel__tag">[待填真实内容]</p>
              </article>
            ))}
          </div>
          <p className="ch-build__hint">滚动切换步骤，字母 T 同步转向。</p>
        </div>
      </div>
    </ChapterShell>
  )
}
