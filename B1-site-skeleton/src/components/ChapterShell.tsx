import { useEffect } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { ChapterMeta } from '../data/chapters'
import { useStageRegistry } from '../app/stageContext'

interface ChapterShellProps {
  meta: ChapterMeta
  sectionRef: RefObject<HTMLElement | null>
  stamp: string
  className?: string
  children: ReactNode
}

/**
 * The only place that knows how a chapter is pinned: a tall section plus a
 * sticky viewport panel. Chapters own their content; this shell owns the
 * scroll geometry and registers the section for the scene director.
 */
export function ChapterShell({ meta, sectionRef, stamp, className, children }: ChapterShellProps) {
  const { register } = useStageRegistry()

  useEffect(() => {
    register(meta.id, sectionRef.current)
    return () => register(meta.id, null)
  }, [meta.id, register, sectionRef])

  return (
    <section
      id={`ch-${meta.id}`}
      data-chapter={meta.id}
      ref={sectionRef as RefObject<HTMLElement>}
      className={`chapter${className ? ` ${className}` : ''}`}
      style={{ '--ch-h': meta.height } as CSSProperties}
      aria-labelledby={`chapter-title-${meta.id}`}
    >
      <div className="chapter__sticky">
        <div className="chapter__mark" aria-hidden="true">
          <span className="chapter__mark-index">{meta.index}</span>
          <span className="chapter__mark-label">{meta.label}</span>
        </div>
        {children}
        <p className="chapter__stamp" aria-hidden="true">
          {stamp}
        </p>
      </div>
    </section>
  )
}
