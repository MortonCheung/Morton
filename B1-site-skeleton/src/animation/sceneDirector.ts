import { CHAPTERS, type ChapterId } from '../data/chapters'
import { clamp, isNarrow } from '../lib/dom'
import { setExtra, setLetters } from '../lib/timeline'
import type { MortonStage } from '../scenes/MortonStage'
import { heroPose, resolvePose, type AnchorContext } from '../scenes/poseModel'

export interface SceneDirectorOptions {
  stage: MortonStage
  sections: Map<ChapterId, HTMLElement>
  reduced: boolean
  onChapter?: (id: ChapterId | 'intro') => void
}

export interface SceneDirector {
  sync: () => void
  destroy: () => void
}

interface Range {
  id: ChapterId
  index: number
  top: number
  height: number
  /** Scrollable distance while the panel is sticky. */
  range: number
}

/**
 * Single writer for the scene pose.
 *
 * Chapter geometry is measured once (and on resize), then ONE rAF-coalesced
 * scroll handler maps scroll position -> chapter progress -> pose. A global
 * writer avoids the classic multi-ScrollTrigger bug where triggers far away
 * from the viewport clamp to 0/1 and fight over the same letters.
 *
 * Chapter content still uses its own GSAP ScrollTrigger with explicit
 * start/end (see useChapterTimeline); this module only owns the 3D stage.
 */
export function createSceneDirector({ stage, sections, reduced, onChapter }: SceneDirectorOptions): SceneDirector {
  let ranges: Range[] = []
  let anchorRatios: AnchorContext['ratios'] = {}
  let raf = 0
  let lastChapter: ChapterId | 'intro' = 'intro'
  let lastProbe = 0
  let lastStory = -1

  const measure = () => {
    const scrollY = window.scrollY
    const vh = window.innerHeight
    const next: Range[] = []
    for (let index = 0; index < CHAPTERS.length; index += 1) {
      const meta = CHAPTERS[index]
      const el = sections.get(meta.id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const top = rect.top + scrollY
      const height = rect.height
      next.push({ id: meta.id, index, top, height, range: Math.max(1, height - vh) })
    }
    ranges = next

    const ratios: AnchorContext['ratios'] = {}
    for (let index = 0; index < CHAPTERS.length; index += 1) {
      const el = sections.get(CHAPTERS[index].id)
      const anchor = el?.querySelector<HTMLElement>('[data-letter-anchor]')
      if (!anchor) {
        ratios[index] = null
        continue
      }
      const rect = anchor.getBoundingClientRect()
      ratios[index] = rect.width < 0.5 && rect.height < 0.5 ? null : (rect.left + rect.width / 2) / window.innerWidth
    }
    anchorRatios = ratios
  }

  const setStory = (value: number) => {
    const rounded = Math.round(value * 10000) / 10000
    if (rounded === lastStory) return
    lastStory = rounded
    document.documentElement.style.setProperty('--story-p', rounded.toFixed(4))
  }

  const setChapter = (value: ChapterId | 'intro') => {
    if (value === lastChapter) return
    lastChapter = value
    if (value === 'intro') delete document.documentElement.dataset.chapter
    else document.documentElement.dataset.chapter = value
    onChapter?.(value)
  }

  const pushProbe = (pose: ReturnType<typeof resolvePose>) => {
    const now = performance.now()
    if (now - lastProbe < 120) return
    lastProbe = now
    setLetters(
      (Object.keys(pose.letters) as Array<keyof typeof pose.letters>).map((letterId) => ({
        id: letterId,
        position: [pose.letters[letterId].x, pose.letters[letterId].y, pose.letters[letterId].z],
        rotation: [pose.letters[letterId].rx, pose.letters[letterId].ry, pose.letters[letterId].rz],
        visible: true,
      })),
    )
    setExtra({
      fit: Number(stage.root.scale.x.toFixed(3)),
      camZ: Number(stage.camera.position.z.toFixed(2)),
      wordWidth: Number(stage.metrics.width.toFixed(3)),
      capHeight: Number(stage.metrics.capHeight.toFixed(3)),
      viewport: [window.innerWidth, window.innerHeight],
    })
  }

  let narrow = isNarrow()

  const applyHero = () => {
    const hero = heroPose(stage.metrics, narrow)
    if (stage.mode === 'story') stage.setPose(hero)
    setStory(0)
    setChapter('intro')
    pushProbe(hero)
  }

  const applyAt = (index: number, id: ChapterId, progress: number) => {
    if (!stage.ready) return
    const pose = resolvePose(index, progress, stage.metrics, narrow, {
      aspect: window.innerWidth / Math.max(1, window.innerHeight),
      fit: stage.root.scale.x,
      ratios: anchorRatios,
    })
    if (stage.mode === 'story') stage.setPose(pose)
    setStory((index + clamp(progress)) / CHAPTERS.length)
    // The chrome follows whichever section covers the viewport centre, so the
    // header never disagrees with the content the visitor is actually reading.
    const centre = window.scrollY + window.innerHeight / 2
    const covering = ranges.find((r) => centre >= r.top && centre < r.top + r.height)
    setChapter(covering ? covering.id : id)
    pushProbe(pose)
  }

  const update = () => {
    raf = 0
    if (reduced || !stage.ready || !ranges.length) return
    if (document.documentElement.dataset.detailOpen === 'true') return
    const y = window.scrollY
    const first = ranges[0]
    const last = ranges[ranges.length - 1]
    if (y < first.top) {
      applyHero()
      return
    }
    if (y >= last.top + last.height) {
      applyAt(last.index, last.id, 1)
      return
    }
    let chosen = ranges[ranges.length - 1]
    for (const range of ranges) {
      if (y >= range.top && y < range.top + range.height) {
        chosen = range
        break
      }
    }
    const progress = clamp((y - chosen.top) / chosen.range)
    applyAt(chosen.index, chosen.id, progress)
  }

  const schedule = () => {
    if (raf) return
    raf = requestAnimationFrame(update)
  }

  const onResize = () => {
    narrow = isNarrow()
    measure()
    schedule()
  }

  const sync = () => {
    measure()
    update()
  }

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', onResize)
  measure()
  update()

  return {
    sync,
    destroy: () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      ranges = []
      delete document.documentElement.dataset.chapter
      document.documentElement.style.removeProperty('--story-p')
    },
  }
}
