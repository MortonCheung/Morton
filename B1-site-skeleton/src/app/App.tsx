import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { MortonStage } from '../scenes/MortonStage'
import { createSceneDirector, type SceneDirector } from '../animation/sceneDirector'
import { runOpening } from '../animation/opening'
import { ScrollTrigger, gsap } from '../animation/useChapterTimeline'
import { installProbe, mark, setExtra, setLetters, setState, type OpeningState } from '../lib/timeline'
import { StageContext } from './stageContext'
import type { ChapterId } from '../data/chapters'
import type { Project } from '../data/projects'
import { Opening } from '../features/opening/Opening'
import { ScrollProgress, SideNav, SiteHeader } from '../components/SiteChrome'
import { MeChapter } from '../features/chapters/MeChapter'
import { OriginChapter } from '../features/chapters/OriginChapter'
import { RecordChapter } from '../features/chapters/RecordChapter'
import { BuildChapter } from '../features/chapters/BuildChapter'
import { OutputChapter } from '../features/chapters/OutputChapter'
import { NextChapter } from '../features/chapters/NextChapter'
import { ProjectDetail } from '../features/detail/ProjectDetail'
import { useDetailController } from '../features/detail/useDetailController'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { emptyMetrics } from '../scenes/poseModel'

installProbe()

const PROGRESS_BY_STATE: Record<OpeningState, number> = {
  loading: 0,
  drawing: 0.4,
  built: 0.75,
  expanding: 0.9,
  hero: 1,
  reduced: 1,
}

export default function App() {
  const reduced = useReducedMotion()
  const [openingState, setOpeningState] = useState<OpeningState>('loading')
  const [ready, setReady] = useState(false)
  const [fatal, setFatal] = useState<string | null>(null)
  const [chapter, setChapter] = useState<ChapterId | 'intro'>('intro')
  const stageHostRef = useRef<HTMLDivElement>(null)
  const sectionsRef = useRef(new Map<ChapterId, HTMLElement>())
  const directorRef = useRef<SceneDirector | null>(null)
  const { session, selectedId, open, beginClose, finishClose } = useDetailController()

  const register = useCallback((id: ChapterId, el: HTMLElement | null) => {
    if (el) sectionsRef.current.set(id, el)
    else sectionsRef.current.delete(id)
  }, [])

  useLayoutEffect(() => {
    // Reduced motion: no WebGL, no scroll-driven letter choreography. The page
    // becomes a static editorial long-read with a DOM wordmark.
    if (reduced) {
      setState('reduced')
      setOpeningState('reduced')
      setReady(true)
      mark('reducedAt')
      const metrics = emptyMetrics()
      setLetters(
        (Object.keys(metrics.baseX) as Array<keyof typeof metrics.baseX>).map((id) => ({
          id,
          position: [metrics.baseX[id], 0, 0],
          rotation: [0, 0, 0],
          visible: false,
        })),
      )
      setExtra({ reducedMotion: true, webgl: false })
      return
    }
    const host = stageHostRef.current
    if (!host) return
    const stage = new MortonStage(host, { reduced })
    let destroyed = false
    let director: SceneDirector | null = null

    const boot = async () => {
      try {
        await stage.load()
        if (destroyed) return
        director = createSceneDirector({
          stage,
          sections: sectionsRef.current,
          reduced,
          onChapter: setChapter,
        })
        directorRef.current = director
        await runOpening(stage, {
          reduced,
          onState: setOpeningState,
          onHero: () => {
            setReady(true)
            director?.sync()
          },
        })
        if (destroyed) return
        director.sync()
        mark('storyReadyAt')
        ScrollTrigger.refresh()
        gsap.delayedCall(0.2, () => ScrollTrigger.refresh())
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[B1] opening failed:', message)
        setFatal(`3D 字形加载失败（${message}）。已降级为纯文本阅读路径，章节与作品详情仍可使用。`)
        setOpeningState('reduced')
        setReady(true)
        if (director) director.sync()
      }
    }
    void boot()

    return () => {
      destroyed = true
      director?.destroy()
      directorRef.current = null
      stage.dispose()
    }
  }, [reduced])

  // Reduced motion has no scene director, so the chrome gets a small observer.
  useLayoutEffect(() => {
    if (!reduced) return
    const sections = Array.from(sectionsRef.current.values())
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.getAttribute('data-chapter')
          if (id) document.documentElement.dataset.chapter = id
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => {
      observer.disconnect()
      delete document.documentElement.dataset.chapter
    }
  }, [reduced])

  const onOpenProject = useCallback(
    (project: Project, source: HTMLButtonElement) => {
      open(project, source)
    },
    [open],
  )

  return (
    <StageContext.Provider value={{ register }}>
      <div className="site" data-morton-root data-motion={reduced ? 'reduced' : 'full'} data-ready={ready}>
        <a className="skip-link" href="#main">
          跳到主要内容
        </a>
        <div className="stage" ref={stageHostRef} aria-hidden="true" />
        <ScrollProgress />
        <SiteHeader />
        <SideNav reduced={reduced} />
        <main id="main" className="site__main">
          <Opening ready={ready} state={openingState} reduced={reduced} progress={PROGRESS_BY_STATE[openingState]} />
          <MeChapter reduced={reduced} />
          <OriginChapter reduced={reduced} />
          <RecordChapter reduced={reduced} />
          <BuildChapter reduced={reduced} />
          <OutputChapter reduced={reduced} selectedId={selectedId} onOpen={onOpenProject} />
          <NextChapter reduced={reduced} />
        </main>
        {session ? <ProjectDetail session={session} reduced={reduced} onBeginClose={beginClose} onFinished={finishClose} /> : null}
        {fatal ? (
          <p className="fatal-note" role="alert">
            {fatal}
          </p>
        ) : null}
        <p className="visually-hidden" aria-live="polite">
          {chapter === 'intro' ? '开篇' : `当前章节 ${chapter}`}
        </p>
      </div>
    </StageContext.Provider>
  )
}
