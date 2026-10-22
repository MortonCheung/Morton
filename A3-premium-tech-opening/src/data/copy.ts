/**
 * All interface copy lives here so it never ends up scattered inside animation
 * callbacks. Keep it short: the letters are the hero, the chrome is a whisper.
 */
export const copy = {
  metaPrimary: 'MORTON',
  metaSecondary: 'PERSONAL IDENTITY',
  tagline: 'Engineered in six letters.',
  replay: 'REPLAY',
  stageLabel: 'MORTON personal identity — opening sequence',
  status: {
    loading: '正在准备字形',
    drawing: '正在逐笔构建 MORTON',
    built: '构建完成，等待渲染资源',
    expanding: '正在展开实体',
    hero: 'MORTON',
    reduced: '已按减少动态效果设置静态展示',
  },
} as const
