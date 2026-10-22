import { useRef } from 'react'
import { ChapterShell } from '../../components/ChapterShell'
import { Kicker } from '../../components/Kicker'
import { output } from '../../data/content'
import { chapterById } from '../../data/chapters'
import { useChapterTimeline } from '../../animation/useChapterTimeline'
import { GalleryTracks } from '../gallery/GalleryTracks'
import type { Project } from '../../data/projects'

const meta = chapterById('O2')

/** Per-track sweep: start/end fractions of the available horizontal overflow. */
const TRACK_SWEEP: Array<[number, number]> = [
  [0, 1],
  [0, 0.72],
  [0, 0.86],
]

export function OutputChapter({
  reduced,
  selectedId,
  onOpen,
}: {
  reduced: boolean
  selectedId: string | null
  onOpen: (project: Project, source: HTMLButtonElement) => void
}) {
  const sectionRef = useRef<HTMLElement>(null)

  useChapterTimeline(
    sectionRef,
    (tl, section) => {
      const body = section.querySelector<HTMLElement>('.ch-output__body')
      const tracks = section.querySelectorAll<HTMLElement>('.gallery__track')
      if (body) tl.fromTo(body, { y: 18 }, { y: 0, duration: 0.5, ease: 'none' }, 0)

      tracks.forEach((track, index) => {
        const viewport = track.parentElement
        if (!viewport) return
        const overflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth + 140)
        const [from, to] = TRACK_SWEEP[index] ?? [0, 1]
        const drift = index === 0 ? -10 : index === 1 ? 8 : -6
        tl.fromTo(
          track,
          { x: () => -overflow() * from, y: 0 },
          { x: () => -overflow() * to, y: drift, duration: 0.86, ease: 'none' },
          0.04,
        )
      })

    },
    [],
    reduced,
  )

  return (
    <ChapterShell meta={meta} sectionRef={sectionRef} stamp={output.stamp} className="ch-output">
      <div className="ch-output__body">
        <div className="ch-output__head">
          <div className="ch-output__headline">
            <Kicker index={meta.index} label={meta.label} zh={meta.zh} />
            <h2 className="display ch-output__title" id="chapter-title-O2">
              {output.title}
              <span className="ch-output__count">08</span>
            </h2>
          </div>
          <div className="ch-output__aside">
            <p className="ch-output__note">{output.note}</p>
            <p className="ch-output__hint">
              <span className="ch-output__hint-arrow" aria-hidden="true">
                ↓
              </span>
              {output.hint}
            </p>
          </div>
        </div>

        <GalleryTracks selectedId={selectedId} onOpen={onOpen} />
      </div>
    </ChapterShell>
  )
}
