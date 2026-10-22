import { useRef } from 'react'
import type { Project } from '../../data/projects'
import { ProjectVisual } from '../../components/ProjectVisual'

interface ProjectCardProps {
  project: Project
  selected: boolean
  onOpen: (project: Project, source: HTMLButtonElement) => void
}

export function ProjectCard({ project, selected, onOpen }: ProjectCardProps) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      type="button"
      ref={ref}
      className={`card${selected ? ' is-selected' : ''}`}
      data-project-card
      data-project-id={project.id}
      data-track={project.track}
      aria-haspopup="dialog"
      aria-label={`${project.title}，打开作品详情`}
      onClick={() => {
        if (ref.current) onOpen(project, ref.current)
      }}
    >
      <span className="card__visual" aria-hidden="true">
        <ProjectVisual shape={project.visual.shape} a={project.visual.a} b={project.visual.b} label="占位图" />
      </span>
      <span className="card__top">
        <span className="card__index">{project.index}</span>
        <span className="card__open" aria-hidden="true">
          打开 <span className="card__arrow">→</span>
        </span>
      </span>
      <span className="card__info">
        <span className="card__title">{project.title}</span>
        <span className="card__meta">
          <span>{project.type}</span>
          <span className="card__dot" aria-hidden="true" />
          <span>{project.year}</span>
          <span className="card__dot" aria-hidden="true" />
          <span>{project.role}</span>
        </span>
      </span>
      <span className="card__rule" aria-hidden="true" />
    </button>
  )
}
