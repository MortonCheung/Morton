import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { origin } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'

const meta = chapterById('O1')
const RING_RADIUS = 38

function nodePosition(angleDeg: number, radius = RING_RADIUS) {
  const angle = (angleDeg * Math.PI) / 180
  return { left: 50 + radius * Math.cos(angle), top: 50 + radius * Math.sin(angle) }
}

export function OriginChapter({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const arc = section.querySelector<SVGCircleElement>('.orbit__arc')
      const nodes = section.querySelectorAll<HTMLElement>('.orbit__node')
      const rows = section.querySelectorAll<HTMLElement>('.origin-row')
      const panels = section.querySelectorAll<HTMLElement>('.origin-detail')
      const body = section.querySelector<HTMLElement>('.ch-origin__body')
      if (!arc || !nodes.length) return

      tl.fromTo(arc, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.86, ease: 'none' }, 0.06)
      if (body) tl.fromTo(body, { y: 22 }, { y: 0, duration: 0.6, ease: 'none' }, 0)

      const start = 0.1
      const span = 0.76
      const step = span / (origin.nodes.length - 1)
      nodes.forEach((node, index) => {
        const at = start + index * step
        const row = rows[index]
        const panel = panels[index]
        tl.fromTo(node, { autoAlpha: 0.24, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.05, ease: 'power1.out' }, at)
        if (row) tl.fromTo(row, { autoAlpha: 0.34, x: 10 }, { autoAlpha: 1, x: 0, duration: 0.06 }, at)
        if (panel) tl.fromTo(panel, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.07 }, at)
        if (index < origin.nodes.length - 1) {
          tl.to(node, { autoAlpha: 0.32, scale: 0.9, duration: 0.05 }, at + step * 0.88)
          if (row) tl.to(row, { autoAlpha: 0.4, duration: 0.05 }, at + step * 0.88)
          if (panel) tl.to(panel, { autoAlpha: 0, duration: 0.05 }, at + step * 0.88)
        }
      })

    },
    [],
    reduced,
  )

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={origin.stamp} className="ch-origin">
      <div className="chapter__grid ch-origin__grid">
        <div className="orbit-wrap" aria-hidden="true" data-letter-anchor>
          <div className="orbit">
            <svg className="orbit__svg" viewBox="0 0 100 100" role="presentation">
              <circle className="orbit__ring" cx="50" cy="50" r={RING_RADIUS} pathLength={100} />
              <circle className="orbit__arc" cx="50" cy="50" r={RING_RADIUS} pathLength={100} />
              {origin.nodes.map((node) => {
                const pos = nodePosition(node.angle)
                return (
                  <g key={node.id} className="orbit__node" style={{ transformOrigin: `${pos.left}% ${pos.top}%` }}>
                    <circle className="orbit__node-halo" cx={pos.left} cy={pos.top} r="2.6" />
                    <circle className="orbit__node-dot" cx={pos.left} cy={pos.top} r="0.9" />
                  </g>
                )
              })}
              <line className="orbit__tick" x1="50" y1="0" x2="50" y2="5" />
              <line className="orbit__tick" x1="50" y1="95" x2="50" y2="100" />
            </svg>
            {origin.nodes.map((node) => {
              const pos = nodePosition(node.angle, RING_RADIUS + 10)
              return (
                <span
                  key={`${node.id}-label`}
                  className="orbit__label"
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                >
                  {node.year}
                </span>
              )
            })}
            <span className="orbit__center">O</span>
          </div>
        </div>

        <div className="ch-origin__body">
          <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
          <h2 className="display ch-origin__title" id="chapter-title-O1">
            轨迹不是一个点，
            <br />
            是一圈一圈向外长的。
          </h2>
          <p className="lead" data-fade>
            {origin.intro}
          </p>

          <ol className="origin-list">
            {origin.nodes.map((node, index) => (
              <li className="origin-row" key={node.id}>
                <span className="origin-row__dot" aria-hidden="true" />
                <span className="origin-row__year">{node.year}</span>
                <span className="origin-row__title">{node.title}</span>
                <span className="origin-row__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ol>

          <div className="origin-details">
            {origin.nodes.map((node) => (
              <p className="origin-detail" key={`${node.id}-detail`}>
                {node.detail}
              </p>
            ))}
          </div>
          <p className="origin-hint">滚动推进圆环：节点依次点亮。</p>
        </div>
      </div>
    </ChapterShell>
  )
}
