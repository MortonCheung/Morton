/**
 * Works overview data. Eight placeholder projects.
 *
 * Only explicit placeholders — no invented names, clients, outcomes or links.
 * `visual` describes the generated placeholder composition (never a real
 * screenshot), `track` assigns the multi-track row.
 */
export interface Project {
  id: string
  index: string
  title: string
  type: string
  role: string
  year: string
  track: 0 | 1 | 2
  /** Placeholder composition: shape + two tones. */
  visual: { shape: 'circle' | 'arc' | 'bars' | 'diagonal' | 'grid' | 'stack' | 'ring' | 'column'; a: string; b: string }
  summary: string
  detail: {
    role: string
    year: string
    status: string
    overview: string
    problem: string
    approach: string
    outcome: string
    link: string
    views: Array<{ id: string; label: string; caption: string; shape: Project['visual']['shape'] }>
  }
}

const views = (shape: Project['visual']['shape']) => [
  { id: 'v1', label: '视图 01', caption: '[待填真实内容：主视觉说明]', shape },
  { id: 'v2', label: '视图 02', caption: '[待填真实内容：过程或细节图]', shape: 'bars' as const },
  { id: 'v3', label: '视图 03', caption: '[待填真实内容：结果或现场图]', shape: 'grid' as const },
]

export const PROJECTS: Project[] = [
  {
    id: 'p01',
    index: '01',
    title: '[作品 01：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 0,
    visual: { shape: 'circle', a: '#d8cbb6', b: '#a2462a' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('circle'),
    },
  },
  {
    id: 'p02',
    index: '02',
    title: '[作品 02：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 0,
    visual: { shape: 'diagonal', a: '#c9c2b0', b: '#1b1915' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('diagonal'),
    },
  },
  {
    id: 'p03',
    index: '03',
    title: '[作品 03：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 0,
    visual: { shape: 'stack', a: '#e3d9c6', b: '#5a5348' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('stack'),
    },
  },
  {
    id: 'p04',
    index: '04',
    title: '[作品 04：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 1,
    visual: { shape: 'ring', a: '#b9ad99', b: '#a2462a' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('ring'),
    },
  },
  {
    id: 'p05',
    index: '05',
    title: '[作品 05：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 1,
    visual: { shape: 'bars', a: '#d5cbb8', b: '#3a352c' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('bars'),
    },
  },
  {
    id: 'p06',
    index: '06',
    title: '[作品 06：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 1,
    visual: { shape: 'arc', a: '#c6bca7', b: '#8c3f28' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('arc'),
    },
  },
  {
    id: 'p07',
    index: '07',
    title: '[作品 07：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 2,
    visual: { shape: 'grid', a: '#ddd3c0', b: '#4d463b' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('grid'),
    },
  },
  {
    id: 'p08',
    index: '08',
    title: '[作品 08：填写真实名称]',
    type: '[项目类型]',
    role: '[我负责的部分]',
    year: '[年份]',
    track: 2,
    visual: { shape: 'column', a: '#c7bda9', b: '#26231d' },
    summary: '[待填真实内容：一句话说明这件作品在做什么。]',
    detail: {
      role: '[我负责的部分]',
      year: '[年份]',
      status: '[状态：已完成 / 进行中]',
      overview: '[待填真实内容：这件作品是什么、为谁做、为什么值得看。]',
      problem: '[待填真实内容：开始时的问题与限制。]',
      approach: '[待填真实内容：你的做法与关键判断。]',
      outcome: '[待填真实内容：结果与仍然存在的问题。]',
      link: '[填写链接]',
      views: views('column'),
    },
  },
]

export const projectById = (id: string): Project | null => PROJECTS.find((p) => p.id === id) ?? null
