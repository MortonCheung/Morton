/**
 * Chapter model for the MORTON spine.
 *
 * `height` is the scroll length of the chapter in viewport heights. The sticky
 * panel inside consumes 100svh, so a 190vh chapter gives 90vh of scroll to
 * advance its narrative. Every chapter owns its own ScrollTrigger, so this
 * number can be tuned per chapter without touching the global choreography.
 */
export type ChapterId = 'M' | 'O1' | 'R' | 'T' | 'O2' | 'N'
export type LetterId = 'M' | 'O1' | 'R' | 'T' | 'O2' | 'N'

export interface ChapterMeta {
  id: ChapterId
  /** Index shown in the page (01–06). */
  index: string
  letter: LetterId
  label: string
  zh: string
  kicker: string
  height: number
}

export const CHAPTERS: ChapterMeta[] = [
  { id: 'M', index: '01', letter: 'M', label: 'ME', zh: '个人定位', kicker: '我是谁 / 正在做什么', height: 190 },
  { id: 'O1', index: '02', letter: 'O1', label: 'ORIGIN', zh: '起点', kicker: '成长与教育的轨迹', height: 210 },
  { id: 'R', index: '03', letter: 'R', label: 'RECORD', zh: '记录', kicker: '做过的事与承担的角色', height: 200 },
  { id: 'T', index: '04', letter: 'T', label: 'THINGS I BUILD', zh: '做法', kicker: '从问题到验证的三步', height: 270 },
  { id: 'O2', index: '05', letter: 'O2', label: 'OUTPUT', zh: '作品', kicker: '作品总览 / 纵向滚动横向浏览', height: 300 },
  { id: 'N', index: '06', letter: 'N', label: 'NEXT', zh: '之后', kicker: '下一步与联系入口', height: 240 },
]

export const chapterById = (id: ChapterId): ChapterMeta => {
  const found = CHAPTERS.find((c) => c.id === id)
  if (!found) throw new Error(`unknown chapter ${id}`)
  return found
}
