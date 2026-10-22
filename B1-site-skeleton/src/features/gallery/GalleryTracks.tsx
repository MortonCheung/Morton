import { PROJECTS, type Project } from '../../data/projects'
import { output } from '../../data/content'
import { ProjectCard } from './ProjectCard'

interface GalleryTracksProps {
  selectedId: string | null
  onOpen: (project: Project, source: HTMLButtonElement) => void
}

const NOTES = [
  {
    heading: '轨道 A 结束',
    body: '[待填真实内容] / 03 件占位作品。新作品追加到 src/data/projects.ts 即可，轨道长度自动计算。',
  },
  {
    heading: '轨道 B 结束',
    body: '[待填真实内容] / 03 件占位作品。轨道速度独立，不需要改动画代码。',
  },
  {
    heading: '[更多作品待补]',
    body: '第 09 件及以后：只加数据，不改 MORTON 主线。',
  },
]

export function GalleryTracks({ selectedId, onOpen }: GalleryTracksProps) {
  const tracks = [0, 1, 2].map((track) => PROJECTS.filter((project) => project.track === track))

  return (
    <div className="gallery">
      {tracks.map((projects, trackIndex) => (
        <div className="gallery__row" key={trackIndex}>
          <p className="gallery__label" aria-hidden="true">
            <span className="gallery__label-index">{String.fromCharCode(65 + trackIndex)}</span>
            <span className="gallery__label-text">{output.trackLabels[trackIndex]}</span>
          </p>
          <div className="gallery__viewport">
            <div className="gallery__track" data-track={trackIndex}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  selected={selectedId === project.id}
                  onOpen={onOpen}
                />
              ))}
              <div className="gallery__note" aria-hidden="true">
                <span className="gallery__note-rule" />
                <strong>{NOTES[trackIndex].heading}</strong>
                <span>{NOTES[trackIndex].body}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
