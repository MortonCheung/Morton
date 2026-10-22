import { hero } from '../../data/content'
import type { OpeningState } from '../../lib/timeline'

const STATE_LABEL: Record<OpeningState, string> = {
  loading: '载入字形 / LOADING',
  drawing: '逐笔构建 / DRAWING',
  built: '构型完成 / BUILT',
  expanding: '展开成体 / EXPANDING',
  hero: '就绪 / READY',
  reduced: '静态路径 / REDUCED',
}

export function Opening({ ready, state, reduced, progress }: { ready: boolean; state: OpeningState; reduced: boolean; progress: number }) {
  return (
    <section className={`opening${ready ? ' is-ready' : ''}`} aria-label="开篇">
      <div className="opening__inner">
        <div className="opening__top">
          <p className="opening__eyebrow">{hero.eyebrow}</p>
          <p className="opening__tag">内容为占位符</p>
        </div>

        {reduced ? (
          <p className="opening__fallback" aria-hidden="true">
            MORTON
          </p>
        ) : null}

        <div className="opening__bottom">
          <div className="opening__statement">
            <p className="opening__lead">{hero.lead}</p>
            <p className="opening__note">{hero.note}</p>
          </div>
          <div className="opening__meta">
            <p className="opening__state" aria-live="polite">
              {STATE_LABEL[state]}
              <span className="opening__state-sep" aria-hidden="true">
                /
              </span>
              {hero.cornerLeft} · {hero.cornerRight}
            </p>
            <div className="opening__cue" aria-hidden="true">
              <span className="opening__cue-label">{hero.scrollLabel}</span>
              <span className="opening__cue-line">
                <span className="opening__cue-fill" style={{ transform: `scaleY(${state === 'hero' || state === 'reduced' ? 1 : 0.2 + progress * 0.6})` }} />
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
