/**
 * Site shell (Phase 3).
 *
 * Home -> About -> Record -> Making -> Works -> Next. The hero is the approved
 * Phase 1 composition; everything below it is the same art system with a changed
 * density (quiet / editorial / exhibition), not the same section repeated.
 *
 * Scroll is locked while the opening cover is up; the detail layer is a source-
 * anchored overlay, so no route change and no scroll loss.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { HeroSection } from '../features/hero/HeroSection'
import { AboutSection } from '../features/story/AboutSection'
import { RecordSection } from '../features/story/RecordSection'
import { MakingSection } from '../features/story/MakingSection'
import { NextSection } from '../features/story/NextSection'
import { WorksSection, type OpenRequest } from '../features/works/WorksSection'
import { ProjectFocus } from '../features/works/ProjectFocus'
import { useSectionReveal } from '../motion/useSectionReveal'

export function Site() {
  const [open, setOpen] = useState<OpenRequest | null>(null)
  const [navOn, setNavOn] = useState(false)
  const savedScroll = useRef(0)
  useSectionReveal('[data-reveal]')

  // the section index only appears once the hero is out of view, so it never
  // sits on top of the opening composition
  useEffect(() => {
    const hero = document.getElementById('index')
    if (!hero) return
    const io = new IntersectionObserver(([entry]) => setNavOn(!entry.isIntersecting), { threshold: 0.25 })
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  const openWork = useCallback((req: OpenRequest) => {
    savedScroll.current = window.scrollY
    document.documentElement.classList.add('is-focus-open')
    setOpen(req)
  }, [])

  const closeWork = useCallback(() => {
    const work = open?.work
    document.documentElement.classList.remove('is-focus-open')
    setOpen(null)
    window.scrollTo(0, savedScroll.current)
    // return focus to the card that opened the layer
    if (work) {
      const el = document.querySelector<HTMLElement>(`[data-work="${work.id}"]`)
      el?.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    return () => {
      document.documentElement.classList.remove('is-focus-open')
    }
  }, [open])

  return (
    <main className="site">
      <HeroSection />
      <AboutSection />
      <RecordSection />
      <MakingSection />
      <WorksSection onOpen={openWork} />
      <NextSection />
      <nav className={`site-nav${navOn ? ' is-on' : ''}`} aria-label="Sections">
        <a href="#index">Index</a>
        <a href="#about">About</a>
        <a href="#record">Record</a>
        <a href="#making">Making</a>
        <a href="#works">Works</a>
        <a href="#next">Next</a>
      </nav>
      {open && <ProjectFocus request={open} onClose={closeWork} />}
    </main>
  )
}
