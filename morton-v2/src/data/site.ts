/** Site content model. All unknown personal facts stay as explicit placeholders. */

export type PlateId = 'p01' | 'p02' | 'p03' | 'p04' | 'p05' | 'p06' | 'p07' | 'p07b' | 'p08'

export interface Work {
  id: string
  index: string
  title: string
  type: string
  year: string
  role: string
  status: string
  plate: PlateId
  /** css aspect-ratio of the exhibit frame */
  ratio: string
  summary: string
  detail: string
}

export const SITE = {
  name: 'MORTON',
  /** Placeholder identity lines — replace with real copy. */
  role: 'Art direction, editorial and exhibition design.',
  index: 'MORTON — [待补副标题]',
  folio: '01 — 06',
  email: '[待补邮箱]',
  location: '[待补城市]',
} as const

export const ABOUT = {
  display: ['Material', 'measure', 'record'] as const,
  intro:
    'A practice organised around material, measure and the printed page: art direction, editorial systems and exhibition design for archives, studios and independent publishers.',
  entries: [
    { year: '[年份]', title: '[档案条目 01]', place: '[地点]' },
    { year: '[年份]', title: '[档案条目 02]', place: '[地点]' },
    { year: '[年份]', title: '[档案条目 03]', place: '[地点]' },
  ],
}

export const RECORD = [
  { year: '[年份]', title: '[经历条目 01]', body: '一句话说明这一段做了什么、在哪、和谁。', plate: 'p04' as PlateId },
  { year: '[年份]', title: '[经历条目 02]', body: '一句话说明这一段做了什么、在哪、和谁。', plate: 'p05' as PlateId },
  { year: '[年份]', title: '[经历条目 03]', body: '一句话说明这一段做了什么、在哪、和谁。', plate: 'p03' as PlateId },
]

export const MAKING = {
  statement: 'How little information does a page need before it becomes an exhibit?',
  steps: [
    { label: 'Material', body: '从材料样本开始：纸、石膏、漆面。先确定它的光，再谈版面。', plate: 'p01' as PlateId },
    { label: 'Measure', body: '把字标放进栅格，量每一处间距与对齐，直到它不需要解释。', plate: 'p08' as PlateId },
    { label: 'Record', body: '把过程留成可以复查的档案：截图、时序、失败与折返。', plate: 'p07' as PlateId },
  ],
}

export const WORKS: Work[] = [
  {
    id: 'w01',
    index: '01',
    title: '[作品 01]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p02',
    ratio: '16 / 9',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
  {
    id: 'w02',
    index: '02',
    title: '[作品 02]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p07',
    ratio: '4 / 5',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
  {
    id: 'w03',
    index: '03',
    title: '[作品 03]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p01',
    ratio: '4 / 5',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
  {
    id: 'w04',
    index: '04',
    title: '[作品 04]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p07b',
    ratio: '3 / 2',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
  {
    id: 'w05',
    index: '05',
    title: '[作品 05]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p06',
    ratio: '3 / 2',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
  {
    id: 'w06',
    index: '06',
    title: '[作品 06]',
    type: '[项目类型]',
    year: '[年份]',
    role: '[角色]',
    status: '[状态]',
    plate: 'p05',
    ratio: '16 / 9',
    summary: '一句话说明这件作品在做什么。',
    detail: '两到三句：为什么做、关键判断、结果与仍然存在的问题。',
  },
]

export const NEXT = {
  line: 'Six letters. One measure.',
  body: '这一页仍然是骨架：真实作品、经历与联系方式会逐条替换占位内容。',
}
