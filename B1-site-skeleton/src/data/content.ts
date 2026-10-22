/**
 * Chapter copy. Every personal fact is an explicit placeholder.
 * Nothing here may be invented: no awards, employers, dates, metrics or links.
 */
export interface Fact {
  label: string
  value: string
}

export const hero = {
  eyebrow: '个人主页 · 全站滚动叙事骨架',
  lead: '六个字母，一条叙事线。',
  note: '从 M 到 N，纵向滚动推进字母、镜头与内容。除「MORTON」外，本页所有个人信息、经历与作品均为占位符。',
  cornerLeft: 'B1 / 骨架',
  cornerRight: '2026',
  scrollLabel: '向下滚动',
}

export const me = {
  title: '把自己放在\n[待填方向] 这条线上。',
  statement:
    '我是 MORTON。目前以 [待填真实身份] 的身份，在 [待填城市] 做 [待填真实内容]。这一段只写清楚一件事：我在解决什么问题，以及为什么是我。',
  facts: [
    { label: '方向', value: '[待填方向：设计 / 工程 / 研究]' },
    { label: '现在', value: '[待填真实内容：当前在做的事]' },
    { label: '关注', value: '[待填真实内容：长期兴趣]' },
  ] as Fact[],
  expandLabel: '更完整的方向说明',
  expand: [
    '这里留给一段更长的自述：你如何进入这个方向、做过哪些取舍、现在最想解决的问题是什么。全部为占位文本，不要照抄。',
    '第二段可以写工作方式：你习惯怎样开始一个项目、如何判断它值得继续、以及你不做什么。',
  ],
  stamp: '01 / ME — 占位内容',
}

export interface OriginNode {
  id: string
  year: string
  title: string
  detail: string
  angle: number
}

export const origin = {
  title: '轨迹不是一个点，是一圈一圈向外长的。',
  intro: '把 O 的圆环展开成一条时间线：四个节点，全部为占位。',
  nodes: [
    { id: 'o1', year: '[年份]', title: '[待填真实内容：起点]', detail: '这一段用来写最早接触 [待填方向] 的契机。占位。', angle: -120 },
    { id: 'o2', year: '[年份]', title: '[待填真实内容：第一次系统学习]', detail: '这一段用来写教育经历或自学路径的关键一步。占位。', angle: -40 },
    { id: 'o3', year: '[年份]', title: '[待填真实内容：第一次做出东西]', detail: '这一段用来写第一个真正完成并交付的项目。占位。', angle: 40 },
    { id: 'o4', year: '[年份]', title: '[待填真实内容：现在的起点]', detail: '这一段用来写当前阶段的起点与目标。占位。', angle: 120 },
  ] as OriginNode[],
  stamp: '02 / ORIGIN — 占位内容',
}

export interface RecordEntry {
  id: string
  period: string
  org: string
  role: string
  line: string
  detail?: string[]
}

export const record = {
  title: '做过的事，按时间排在一条线上。',
  intro: '四条占位记录；第二条可展开，示范章节内展开不与主滚动冲突。',
  entries: [
    {
      id: 'r1',
      period: '[起止时间]',
      org: '[待填真实内容：组织 / 项目]',
      role: '[待填角色]',
      line: '[待填真实内容：你负责的那一件事，一行说完。]',
    },
    {
      id: 'r2',
      period: '[起止时间]',
      org: '[待填真实内容：组织 / 项目]',
      role: '[待填角色]',
      line: '[待填真实内容：你负责的那一件事，一行说完。]',
      detail: [
        '展开后可以放更完整的背景、你的判断和最后的结果。这里全部是占位文本，不得编造数字、奖项或公司名。',
        '也可以放一段「如果重来会怎么做」的复盘。',
      ],
    },
    {
      id: 'r3',
      period: '[起止时间]',
      org: '[待填真实内容：组织 / 项目]',
      role: '[待填角色]',
      line: '[待填真实内容：你负责的那一件事，一行说完。]',
    },
    {
      id: 'r4',
      period: '[起止时间]',
      org: '[待填真实内容：组织 / 项目]',
      role: '[待填角色]',
      line: '[待填真实内容：你负责的那一件事，一行说完。]',
    },
  ] as RecordEntry[],
  stamp: '03 / RECORD — 占位内容',
}

export interface BuildStep {
  id: string
  index: string
  label: string
  title: string
  body: string
  notes: string[]
}

export const build = {
  title: 'T 的结构可以拆开，再装回去。',
  intro: '滚动依次推进三步：问题 → 实现 → 验证。字母 T 同时改变朝向，内容与字母是同一件事的两种写法。',
  steps: [
    {
      id: 't1',
      index: '01',
      label: '问题 / 想法',
      title: '先把问题写清楚。',
      body: '这里放一句对问题的定义：谁遇到、在什么场景、现在的做法为什么不够好。占位文本。',
      notes: ['[待填真实内容：约束条件]', '[待填真实内容：不做的那部分]'],
    },
    {
      id: 't2',
      index: '02',
      label: '设计与实现',
      title: '把判断变成可以运行的东西。',
      body: '这里放做法：选择了什么结构、放弃了什么、怎样在有限时间里切出第一版。占位文本。',
      notes: ['[待填真实内容：关键取舍]', '[待填真实内容：技术栈 / 材料]'],
    },
    {
      id: 't3',
      index: '03',
      label: '验证与结果',
      title: '用证据结束争论。',
      body: '这里放验证方式与结果：怎么知道它成立、哪里仍然不成立。占位文本，不得虚构数据。',
      notes: ['[待填真实内容：验证方式]', '[待填真实内容：仍存在的风险]'],
    },
  ] as BuildStep[],
  stamp: '04 / THINGS I BUILD — 占位内容',
}

export const output = {
  kicker: '05 / OUTPUT',
  title: '作品总览',
  note: '多轨道横向画廊：纵向滚动推动三条轨道以不同速度横移。点开任意作品，它会从所在位置展开成详情。',
  hint: '纵向滚动 → 横向浏览',
  trackLabels: ['近期', '进行中', '更早'],
  moreLabel: '[更多作品待补]',
  stamp: '05 / OUTPUT — 占位内容',
}

export const next = {
  title: '下一步，以及怎样找到我。',
  statement: '接下来要做的事：[待填真实内容]。如果你在做相关的事，欢迎直接联系。',
  directions: [
    { label: '[待填方向 01]', note: '[待填真实内容：一句说明]' },
    { label: '[待填方向 02]', note: '[待填真实内容：一句说明]' },
    { label: '[待填方向 03]', note: '[待填真实内容：一句说明]' },
  ],
  links: [
    { label: 'GitHub', value: '[填写链接]', href: null as string | null },
    { label: 'Gitee', value: '[填写链接]', href: null as string | null },
    { label: '简历 PDF', value: '[填写链接]', href: null as string | null },
    { label: '邮箱', value: '[填写邮箱]', href: null as string | null },
  ],
  closing: 'MORTON',
  closingNote: '首尾闭环：六个字母回到开场的位置。',
  footerNote: 'B1 / 全站滚动叙事骨架 · 所有内容为占位符',
  stamp: '06 / NEXT — 占位内容',
}
